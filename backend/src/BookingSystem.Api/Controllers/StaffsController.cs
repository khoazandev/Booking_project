using BookingSystem.Api.Models.DTOs.Staffs;
using BookingSystem.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StaffsController : ControllerBase
{
    private readonly IStaffScheduleService _staffScheduleService;

    public StaffsController(IStaffScheduleService staffScheduleService)
    {
        _staffScheduleService = staffScheduleService;
    }

    [HttpGet]
    public async Task<IActionResult> GetStaffs([FromQuery] bool? isActive)
    {
        var staffs = await _staffScheduleService.GetStaffsAsync(isActive);
        return Ok(staffs);
    }

    [HttpGet("{id}/schedules")]
    public async Task<IActionResult> GetSchedules(
        int id,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to)
    {
        var schedules = await _staffScheduleService.GetSchedulesAsync(id, from, to);
        return Ok(schedules);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id}/schedules")]
    public async Task<IActionResult> CreateSchedule(int id, [FromBody] CreateScheduleRequestDto request)
    {
        var created = await _staffScheduleService.CreateScheduleAsync(id, request);
        return StatusCode(201, created);
    }
}
