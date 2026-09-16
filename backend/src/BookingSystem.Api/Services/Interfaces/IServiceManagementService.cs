using BookingSystem.Api.Models.DTOs.Common;
using BookingSystem.Api.Models.DTOs.Services;

namespace BookingSystem.Api.Services.Interfaces;

public interface IServiceManagementService
{
    Task<PagedResultDto<ServiceDto>> GetServicesAsync(string? search, bool? isActive, int page, int pageSize);
    Task<ServiceDto> GetByIdAsync(int id);
    Task<ServiceDto> CreateAsync(CreateServiceRequestDto request);
    Task<ServiceDto> UpdateAsync(int id, UpdateServiceRequestDto request);
}
