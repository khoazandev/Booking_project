using BookingSystem.Api.Models.DTOs.Staffs;

namespace BookingSystem.Api.Services.Interfaces;

public interface IStaffScheduleService
{
    Task<IEnumerable<StaffDto>> GetStaffsAsync(bool? isActive);
    Task<StaffDto> CreateStaffAsync(CreateStaffRequestDto request);
    Task<IEnumerable<WorkScheduleDto>> GetSchedulesAsync(int staffId, DateOnly? from, DateOnly? to);
    Task<WorkScheduleDto> CreateScheduleAsync(int staffId, CreateScheduleRequestDto request);
}
