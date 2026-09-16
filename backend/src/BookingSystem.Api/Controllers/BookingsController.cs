using System.Security.Claims;
using BookingSystem.Api.Models.DTOs.Bookings;
using BookingSystem.Api.Models.Enums;
using BookingSystem.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpGet("available-slots")]
    public async Task<IActionResult> GetAvailableSlots(
        [FromQuery] int staffId,
        [FromQuery] int serviceId,
        [FromQuery] DateOnly date)
    {
        var slots = await _bookingService.GetAvailableSlotsAsync(staffId, serviceId, date);
        return Ok(slots);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequestDto request)
    {
        var userId = GetCurrentUserId();
        var booking = await _bookingService.CreateBookingAsync(userId, request);
        return StatusCode(201, booking);
    }

    [Authorize]
    [HttpGet("my-bookings")]
    public async Task<IActionResult> GetMyBookings(
        [FromQuery] BookingStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var userId = GetCurrentUserId();
        var result = await _bookingService.GetMyBookingsAsync(userId, status, page, pageSize);
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> GetAllBookings(
        [FromQuery] BookingStatus? status,
        [FromQuery] int? staffId,
        [FromQuery] DateOnly? date,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _bookingService.GetAllBookingsAsync(status, staffId, date, page, pageSize);
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateBookingStatusDto request)
    {
        var result = await _bookingService.UpdateStatusAsync(id, request.Status);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelBooking(int id, [FromBody] CancelBookingRequestDto request)
    {
        var userId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");
        var result = await _bookingService.CancelBookingAsync(id, userId, isAdmin, request.CancellationReason);
        return Ok(result);
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(claim) || !int.TryParse(claim, out var userId))
        {
            throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");
        }
        return userId;
    }
}
