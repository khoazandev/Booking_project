using BookingSystem.Api.Models.DTOs.Auth;

namespace BookingSystem.Api.Services.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request);
    Task<UserDto> GetCurrentUserAsync(int userId);
}
