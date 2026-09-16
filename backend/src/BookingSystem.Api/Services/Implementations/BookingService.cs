using System.Collections.Concurrent;
using System.Data;
using BookingSystem.Api.Common.Exceptions;
using BookingSystem.Api.Data;
using BookingSystem.Api.Hubs;
using BookingSystem.Api.Models.DTOs.Bookings;
using BookingSystem.Api.Models.DTOs.Common;
using BookingSystem.Api.Models.Entities;
using BookingSystem.Api.Models.Enums;
using BookingSystem.Api.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BookingSystem.Api.Services.Implementations;

public class BookingService : IBookingService
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<BookingHub> _hubContext;

    // Concurrency Lock: Semaphore per Staff ID to eliminate race conditions
    // when multiple users attempt to book the exact same slot at the exact same millisecond.
    private static readonly ConcurrentDictionary<int, SemaphoreSlim> _staffLocks = new();

    public BookingService(ApplicationDbContext context, IHubContext<BookingHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    public async Task<IEnumerable<AvailableSlotDto>> GetAvailableSlotsAsync(int staffId, int serviceId, DateOnly date)
    {
        var service = await _context.Services.FindAsync(serviceId);
        if (service == null || !service.IsActive)
        {
            throw new BadRequestException("Dịch vụ không tồn tại hoặc đã bị khóa.");
        }

        var staff = await _context.Staffs.FindAsync(staffId);
        if (staff == null || !staff.IsActive)
        {
            throw new BadRequestException("Nhân viên không tồn tại hoặc đã bị khóa.");
        }

        var schedules = await _context.WorkSchedules
            .AsNoTracking()
            .Where(w => w.StaffId == staffId && w.WorkDate == date)
            .OrderBy(w => w.StartTime)
            .ToListAsync();

        if (!schedules.Any())
        {
            return Enumerable.Empty<AvailableSlotDto>();
        }

        var dayStart = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var dayEnd = date.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var existingBookings = await _context.Bookings
            .AsNoTracking()
            .Where(b => b.StaffId == staffId &&
                        b.Status != BookingStatus.Cancelled &&
                        b.StartTime >= dayStart &&
                        b.StartTime <= dayEnd)
            .ToListAsync();

        var slots = new List<AvailableSlotDto>();
        var duration = TimeSpan.FromMinutes(service.DurationMinutes);
        var step = TimeSpan.FromMinutes(30); // 30-minute interval grid

        foreach (var sched in schedules)
        {
            var schedStart = date.ToDateTime(sched.StartTime, DateTimeKind.Utc);
            var schedEnd = date.ToDateTime(sched.EndTime, DateTimeKind.Utc);

            var currentSlotStart = schedStart;

            while (currentSlotStart + duration <= schedEnd)
            {
                var currentSlotEnd = currentSlotStart + duration;

                // Check conflict: NewStart < ExistingEnd && NewEnd > ExistingStart
                var hasConflict = existingBookings.Any(b =>
                    currentSlotStart < b.EndTime && currentSlotEnd > b.StartTime);

                var isPast = currentSlotStart <= DateTime.UtcNow;

                slots.Add(new AvailableSlotDto
                {
                    StartTime = currentSlotStart,
                    EndTime = currentSlotEnd,
                    IsAvailable = !hasConflict && !isPast,
                    ConflictReason = isPast 
                        ? "Đã qua thời gian hiện tại" 
                        : (hasConflict ? "Nhân viên đã có lịch hẹn" : null)
                });

                currentSlotStart = currentSlotStart.Add(step);
            }
        }

        return slots;
    }

    public async Task<BookingDto> CreateBookingAsync(int customerId, CreateBookingRequestDto request)
    {
        // 1. Validate customer
        var customer = await _context.Users.FindAsync(customerId);
        if (customer == null)
        {
            throw new NotFoundException("Không tìm thấy thông tin khách hàng.");
        }

        // 2. Validate service & staff
        var service = await _context.Services.FindAsync(request.ServiceId);
        if (service == null || !service.IsActive)
        {
            throw new BadRequestException("Dịch vụ đã chọn không tồn tại hoặc đang bị khóa.");
        }

        var staff = await _context.Staffs.FindAsync(request.StaffId);
        if (staff == null || !staff.IsActive)
        {
            throw new BadRequestException("Nhân viên đã chọn không tồn tại hoặc đang bị khóa.");
        }

        // 3. TC1: Validate StartTime > UtcNow
        var startTimeUtc = request.StartTime.ToUniversalTime();
        if (startTimeUtc <= DateTime.UtcNow)
        {
            throw new BadRequestException("Thời gian bắt đầu đặt lịch phải lớn hơn thời điểm hiện tại.");
        }

        // 4. Calculate EndTime from Service.DurationMinutes
        var endTimeUtc = startTimeUtc.AddMinutes(service.DurationMinutes);

        // 5. TC2: Validate booking window falls completely within staff's WorkSchedule
        var bookingDate = DateOnly.FromDateTime(startTimeUtc);
        var bookingStartTime = TimeOnly.FromDateTime(startTimeUtc);
        var bookingEndTime = TimeOnly.FromDateTime(endTimeUtc);

        var schedule = await _context.WorkSchedules
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.StaffId == staff.Id &&
                                      w.WorkDate == bookingDate &&
                                      w.StartTime <= bookingStartTime &&
                                      w.EndTime >= bookingEndTime);

        if (schedule == null)
        {
            throw new BadRequestException("Khung giờ đặt lịch nằm ngoài ca làm việc của nhân viên trong ngày đã chọn.");
        }

        // 6. BONUS 5: Concurrency Control / Race Condition Prevention
        // Acquire staff semaphore lock so simultaneous requests for the same staff
        // are serialized and checked atomically against the database.
        var staffLock = _staffLocks.GetOrAdd(staff.Id, _ => new SemaphoreSlim(1, 1));
        await staffLock.WaitAsync();

        try
        {
            // TC3: Validate Overlap Detection Formula within the protected critical section
            // NewStart < ExistingEnd && NewEnd > ExistingStart for Status != Cancelled
            var hasConflict = await _context.Bookings
                .AnyAsync(b => b.StaffId == staff.Id &&
                               b.Status != BookingStatus.Cancelled &&
                               startTimeUtc < b.EndTime &&
                               endTimeUtc > b.StartTime);

            if (hasConflict)
            {
                throw new ConflictException("Nhân viên đã có lịch hẹn trong khung giờ này. Vui lòng chọn khung giờ khác.");
            }

            // Generate Unique Booking Code
            var bookingCode = $"BK-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

            var booking = new Booking
            {
                BookingCode = bookingCode,
                CustomerId = customer.Id,
                ServiceId = service.Id,
                StaffId = staff.Id,
                StartTime = startTimeUtc,
                EndTime = endTimeUtc,
                Status = BookingStatus.Pending,
                CustomerNote = request.CustomerNote?.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            var dto = new BookingDto
            {
                Id = booking.Id,
                BookingCode = booking.BookingCode,
                CustomerId = customer.Id,
                CustomerName = customer.FullName,
                ServiceId = service.Id,
                ServiceName = service.Name,
                ServicePrice = service.Price,
                DurationMinutes = service.DurationMinutes,
                StaffId = staff.Id,
                StaffName = staff.FullName,
                StartTime = booking.StartTime,
                EndTime = booking.EndTime,
                Status = booking.Status,
                CustomerNote = booking.CustomerNote,
                CreatedAt = booking.CreatedAt
            };

            // BONUS 3: SignalR Realtime Broadcast
            await _hubContext.Clients.All.SendAsync("BookingCreated", dto);
            await _hubContext.Clients.All.SendAsync("AvailableSlotsChanged", new
            {
                StaffId = staff.Id,
                Date = bookingDate.ToString("yyyy-MM-dd")
            });

            return dto;
        }
        finally
        {
            staffLock.Release();
        }
    }

    public async Task<PagedResultDto<BookingDto>> GetMyBookingsAsync(int customerId, BookingStatus? status, int page, int pageSize)
    {
        // TC4: IDOR Prevention - Strictly filter by customerId
        var query = _context.Bookings
            .AsNoTracking()
            .Include(b => b.Customer)
            .Include(b => b.Service)
            .Include(b => b.Staff)
            .Where(b => b.CustomerId == customerId);

        if (status.HasValue)
        {
            query = query.Where(b => b.Status == status.Value);
        }

        var totalCount = await query.CountAsync();

        var items = await query.OrderByDescending(b => b.StartTime)
                               .Skip((page - 1) * pageSize)
                               .Take(pageSize)
                               .Select(b => MapToDto(b))
                               .ToListAsync();

        return new PagedResultDto<BookingDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<PagedResultDto<BookingDto>> GetAllBookingsAsync(BookingStatus? status, int? staffId, DateOnly? date, int page, int pageSize)
    {
        var query = _context.Bookings
            .AsNoTracking()
            .Include(b => b.Customer)
            .Include(b => b.Service)
            .Include(b => b.Staff)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(b => b.Status == status.Value);
        }

        if (staffId.HasValue)
        {
            query = query.Where(b => b.StaffId == staffId.Value);
        }

        if (date.HasValue)
        {
            var dayStart = date.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var dayEnd = date.Value.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
            query = query.Where(b => b.StartTime >= dayStart && b.StartTime <= dayEnd);
        }

        var totalCount = await query.CountAsync();

        var items = await query.OrderByDescending(b => b.StartTime)
                               .Skip((page - 1) * pageSize)
                               .Take(pageSize)
                               .Select(b => MapToDto(b))
                               .ToListAsync();

        return new PagedResultDto<BookingDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<BookingDto> UpdateStatusAsync(int bookingId, BookingStatus newStatus)
    {
        var booking = await _context.Bookings
            .Include(b => b.Customer)
            .Include(b => b.Service)
            .Include(b => b.Staff)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
        {
            throw new NotFoundException("Không tìm thấy lịch đặt.");
        }

        booking.Status = newStatus;
        await _context.SaveChangesAsync();

        var dto = MapToDto(booking);

        // BONUS 3: SignalR Realtime Broadcast
        await _hubContext.Clients.All.SendAsync("BookingStatusUpdated", dto);

        return dto;
    }

    public async Task<BookingDto> CancelBookingAsync(int bookingId, int currentUserId, bool isAdmin, string cancellationReason)
    {
        if (string.IsNullOrWhiteSpace(cancellationReason))
        {
            throw new BadRequestException("Lý do hủy lịch không được để trống.");
        }

        var booking = await _context.Bookings
            .Include(b => b.Customer)
            .Include(b => b.Service)
            .Include(b => b.Staff)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
        {
            throw new NotFoundException("Không tìm thấy lịch đặt.");
        }

        // TC4: Verify ownership for non-admin
        if (!isAdmin && booking.CustomerId != currentUserId)
        {
            throw new ForbiddenException("Bạn không có quyền hủy lịch đặt của khách hàng khác.");
        }

        // TC6: Cannot cancel completed booking
        if (booking.Status == BookingStatus.Completed)
        {
            throw new BadRequestException("Không thể hủy lịch đặt đã hoàn thành.");
        }

        // TC6: Cannot cancel if booking has already started or passed
        if (booking.StartTime <= DateTime.UtcNow)
        {
            throw new BadRequestException("Không thể hủy lịch đặt đã bắt đầu hoặc đã qua thời gian hẹn.");
        }

        booking.Status = BookingStatus.Cancelled;
        booking.CancellationReason = cancellationReason.Trim();

        await _context.SaveChangesAsync();

        var dto = MapToDto(booking);

        // BONUS 3: SignalR Realtime Broadcast
        await _hubContext.Clients.All.SendAsync("BookingCancelled", dto);
        await _hubContext.Clients.All.SendAsync("AvailableSlotsChanged", new
        {
            StaffId = booking.StaffId,
            Date = DateOnly.FromDateTime(booking.StartTime).ToString("yyyy-MM-dd")
        });

        return dto;
    }

    private static BookingDto MapToDto(Booking b)
    {
        return new BookingDto
        {
            Id = b.Id,
            BookingCode = b.BookingCode,
            CustomerId = b.CustomerId,
            CustomerName = b.Customer?.FullName ?? string.Empty,
            ServiceId = b.ServiceId,
            ServiceName = b.Service?.Name ?? string.Empty,
            ServicePrice = b.Service?.Price ?? 0,
            DurationMinutes = b.Service?.DurationMinutes ?? 0,
            StaffId = b.StaffId,
            StaffName = b.Staff?.FullName ?? string.Empty,
            StartTime = b.StartTime,
            EndTime = b.EndTime,
            Status = b.Status,
            CustomerNote = b.CustomerNote,
            CancellationReason = b.CancellationReason,
            CreatedAt = b.CreatedAt
        };
    }
}
