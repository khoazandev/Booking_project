using BookingSystem.Api.Models.DTOs.Services;
using BookingSystem.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController : ControllerBase
{
    private readonly IServiceManagementService _serviceManagement;

    public ServicesController(IServiceManagementService serviceManagement)
    {
        _serviceManagement = serviceManagement;
    }

    [HttpGet]
    public async Task<IActionResult> GetServices(
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        // If caller is not Admin, default or force isActive = true
        if (!User.IsInRole("Admin"))
        {
            isActive = true;
        }

        var result = await _serviceManagement.GetServicesAsync(search, isActive, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _serviceManagement.GetByIdAsync(id);
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateServiceRequestDto request)
    {
        var result = await _serviceManagement.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateServiceRequestDto request)
    {
        var result = await _serviceManagement.UpdateAsync(id, request);
        return Ok(result);
    }
}
