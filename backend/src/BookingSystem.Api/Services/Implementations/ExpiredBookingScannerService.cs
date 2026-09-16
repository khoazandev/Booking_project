using BookingSystem.Api.Data;
using BookingSystem.Api.Hubs;
using BookingSystem.Api.Models.Enums;
using BookingSystem.Api.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BookingSystem.Api.Services.Implementations;

public class ExpiredBookingScannerService : IExpiredBookingScannerService
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<BookingHub> _hubContext;
    private readonly ILogger<ExpiredBookingScannerService> _logger;

    public ExpiredBookingScannerService(
        ApplicationDbContext context,
        IHubContext<BookingHub> hubContext,
        ILogger<ExpiredBookingScannerService> logger)
    {
        _context = context;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task<int> CancelExpiredPendingBookingsAsync()
    {
        var now = DateTime.UtcNow;

        var expiredBookings = await _context.Bookings
            .Where(b => b.Status == BookingStatus.Pending && b.StartTime <= now)
            .ToListAsync();

        if (!expiredBookings.Any())
        {
            return 0;
        }

        _logger.LogInformation("Found {Count} expired pending bookings to cancel automatically.", expiredBookings.Count);

        foreach (var booking in expiredBookings)
        {
            booking.Status = BookingStatus.Cancelled;
            booking.CancellationReason = "Hệ thống tự động hủy do quá hạn hẹn mà chưa được xác nhận.";
        }

        await _context.SaveChangesAsync();

        // Broadcast realtime update to clients
        await _hubContext.Clients.All.SendAsync("BookingStatusUpdated", new
        {
            Action = "ExpiredCancelled",
            Count = expiredBookings.Count,
            Timestamp = DateTime.UtcNow
        });

        return expiredBookings.Count;
    }
}
