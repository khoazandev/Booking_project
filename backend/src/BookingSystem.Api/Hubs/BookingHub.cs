using Microsoft.AspNetCore.SignalR;

namespace BookingSystem.Api.Hubs;

public class BookingHub : Hub
{
    // Clients can join a room for a specific staff or general notifications
    public async Task JoinStaffGroup(string staffId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"staff_{staffId}");
    }

    public async Task LeaveStaffGroup(string staffId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"staff_{staffId}");
    }
}
