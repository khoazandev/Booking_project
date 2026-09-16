using BookingSystem.Api.Models.DTOs.Bookings;
using BookingSystem.Api.Models.DTOs.Common;
using BookingSystem.Api.Models.Enums;

namespace BookingSystem.Api.Services.Interfaces;

public interface IBookingService
{
    Task<IEnumerable<AvailableSlotDto>> GetAvailableSlotsAsync(int staffId, int serviceId, DateOnly date);
    Task<BookingDto> CreateBookingAsync(int customerId, CreateBookingRequestDto request);
    Task<PagedResultDto<BookingDto>> GetMyBookingsAsync(int customerId, BookingStatus? status, int page, int pageSize);
    Task<PagedResultDto<BookingDto>> GetAllBookingsAsync(BookingStatus? status, int? staffId, DateOnly? date, int page, int pageSize);
    Task<BookingDto> UpdateStatusAsync(int bookingId, BookingStatus newStatus);
    Task<BookingDto> CancelBookingAsync(int bookingId, int currentUserId, bool isAdmin, string cancellationReason);
}
