using System.ComponentModel.DataAnnotations;

namespace BookingSystem.Api.Models.DTOs.Staffs;

public class StaffDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class WorkScheduleDto
{
    public int Id { get; set; }
    public int StaffId { get; set; }
    public DateOnly WorkDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
}

public class CreateScheduleRequestDto
{
    [Required(ErrorMessage = "Ngày làm việc không được để trống")]
    public DateOnly WorkDate { get; set; }

    [Required(ErrorMessage = "Giờ bắt đầu không được để trống")]
    public TimeOnly StartTime { get; set; }

    [Required(ErrorMessage = "Giờ kết thúc không được để trống")]
    public TimeOnly EndTime { get; set; }
}
