using System.ComponentModel.DataAnnotations;

namespace BookingSystem.Api.Models.DTOs.Services;

public class ServiceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public bool IsActive { get; set; }
}

public class CreateServiceRequestDto
{
    [Required(ErrorMessage = "Tên dịch vụ không được để trống")]
    [MaxLength(150, ErrorMessage = "Tên dịch vụ tối đa 150 ký tự")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500, ErrorMessage = "Mô tả tối đa 500 ký tự")]
    public string? Description { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Thời lượng thực hiện phải lớn hơn 0 phút")]
    public int DurationMinutes { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Giá dịch vụ không được âm")]
    public decimal Price { get; set; }

    public bool IsActive { get; set; } = true;
}

public class UpdateServiceRequestDto : CreateServiceRequestDto
{
}
