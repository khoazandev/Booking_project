using System.ComponentModel.DataAnnotations;
using BookingSystem.Api.Models.Enums;

namespace BookingSystem.Api.Models.DTOs.Bookings;

public class BookingDto
{
    public int Id { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public decimal ServicePrice { get; set; }
    public int DurationMinutes { get; set; }
    public int StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public BookingStatus Status { get; set; }
    public string? CustomerNote { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateBookingRequestDto
{
    [Required(ErrorMessage = "Dịch vụ không được để trống")]
    public int ServiceId { get; set; }

    [Required(ErrorMessage = "Nhân viên không được để trống")]
    public int StaffId { get; set; }

    [Required(ErrorMessage = "Thời gian bắt đầu không được để trống")]
    public DateTime StartTime { get; set; }

    [MaxLength(500, ErrorMessage = "Ghi chú tối đa 500 ký tự")]
    public string? CustomerNote { get; set; }
}

public class CancelBookingRequestDto
{
    [Required(ErrorMessage = "Lý do hủy lịch không được để trống")]
    [MaxLength(500, ErrorMessage = "Lý do hủy tối đa 500 ký tự")]
    public string CancellationReason { get; set; } = string.Empty;
}

public class UpdateBookingStatusDto
{
    [Required(ErrorMessage = "Trạng thái mới không được để trống")]
    public BookingStatus Status { get; set; }
}

public class AvailableSlotDto
{
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public bool IsAvailable { get; set; }
    public string? ConflictReason { get; set; }
}
