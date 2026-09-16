namespace BookingSystem.Api.Models.Entities;

public class WorkSchedule
{
    public int Id { get; set; }
    public int StaffId { get; set; }
    public DateOnly WorkDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    // Navigation property
    public Staff Staff { get; set; } = null!;
}
