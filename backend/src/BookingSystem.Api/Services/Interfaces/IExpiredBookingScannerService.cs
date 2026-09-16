namespace BookingSystem.Api.Services.Interfaces;

public interface IExpiredBookingScannerService
{
    Task<int> CancelExpiredPendingBookingsAsync();
}
