namespace BookingSystem.Api.Models.Entities;

public class Staff
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<WorkSchedule> WorkSchedules { get; set; } = new List<WorkSchedule>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
