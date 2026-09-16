using BookingSystem.Api.Common.Exceptions;
using BookingSystem.Api.Data;
using BookingSystem.Api.Models.DTOs.Staffs;
using BookingSystem.Api.Models.Entities;
using BookingSystem.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingSystem.Api.Services.Implementations;

public class StaffScheduleService : IStaffScheduleService
{
    private readonly ApplicationDbContext _context;

    public StaffScheduleService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<StaffDto>> GetStaffsAsync(bool? isActive)
    {
        var query = _context.Staffs.AsNoTracking().AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(s => s.IsActive == isActive.Value);
        }

        return await query.OrderBy(s => s.Id)
                          .Select(s => new StaffDto
                          {
                              Id = s.Id,
                              FullName = s.FullName,
                              Email = s.Email,
                              IsActive = s.IsActive
                          })
                          .ToListAsync();
    }

    public async Task<IEnumerable<WorkScheduleDto>> GetSchedulesAsync(int staffId, DateOnly? from, DateOnly? to)
    {
        var query = _context.WorkSchedules.AsNoTracking()
                                          .Where(w => w.StaffId == staffId);

        if (from.HasValue)
        {
            query = query.Where(w => w.WorkDate >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(w => w.WorkDate <= to.Value);
        }

        return await query.OrderBy(w => w.WorkDate)
                          .ThenBy(w => w.StartTime)
                          .Select(w => new WorkScheduleDto
                          {
                              Id = w.Id,
                              StaffId = w.StaffId,
                              WorkDate = w.WorkDate,
                              StartTime = w.StartTime,
                              EndTime = w.EndTime
                          })
                          .ToListAsync();
    }

    public async Task<WorkScheduleDto> CreateScheduleAsync(int staffId, CreateScheduleRequestDto request)
    {
        var staff = await _context.Staffs.FindAsync(staffId);
        if (staff == null)
        {
            throw new NotFoundException("Không tìm thấy nhân viên.");
        }

        if (request.StartTime >= request.EndTime)
        {
            throw new BadRequestException("Giờ bắt đầu ca làm việc phải nhỏ hơn giờ kết thúc.");
        }

        // Validate no overlapping schedules for the same staff on the same date
        var overlapping = await _context.WorkSchedules
            .AnyAsync(w => w.StaffId == staffId &&
                           w.WorkDate == request.WorkDate &&
                           request.StartTime < w.EndTime &&
                           request.EndTime > w.StartTime);

        if (overlapping)
        {
            throw new ConflictException("Nhân viên đã có ca làm việc trùng thời gian trong ngày này.");
        }

        var schedule = new WorkSchedule
        {
            StaffId = staffId,
            WorkDate = request.WorkDate,
            StartTime = request.StartTime,
            EndTime = request.EndTime
        };

        _context.WorkSchedules.Add(schedule);
        await _context.SaveChangesAsync();

        return new WorkScheduleDto
        {
            Id = schedule.Id,
            StaffId = schedule.StaffId,
            WorkDate = schedule.WorkDate,
            StartTime = schedule.StartTime,
            EndTime = schedule.EndTime
        };
    }
}
