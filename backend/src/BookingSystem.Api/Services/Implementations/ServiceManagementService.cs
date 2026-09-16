using BookingSystem.Api.Common.Exceptions;
using BookingSystem.Api.Data;
using BookingSystem.Api.Models.DTOs.Common;
using BookingSystem.Api.Models.DTOs.Services;
using BookingSystem.Api.Models.Entities;
using BookingSystem.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingSystem.Api.Services.Implementations;

public class ServiceManagementService : IServiceManagementService
{
    private readonly ApplicationDbContext _context;

    public ServiceManagementService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResultDto<ServiceDto>> GetServicesAsync(string? search, bool? isActive, int page, int pageSize)
    {
        var query = _context.Services.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(s => s.Name.ToLower().Contains(search.ToLower()) || 
                                     (s.Description != null && s.Description.ToLower().Contains(search.ToLower())));
        }

        if (isActive.HasValue)
        {
            query = query.Where(s => s.IsActive == isActive.Value);
        }

        var totalCount = await query.CountAsync();

        var items = await query.OrderBy(s => s.Id)
                               .Skip((page - 1) * pageSize)
                               .Take(pageSize)
                               .Select(s => new ServiceDto
                               {
                                   Id = s.Id,
                                   Name = s.Name,
                                   Description = s.Description,
                                   DurationMinutes = s.DurationMinutes,
                                   Price = s.Price,
                                   IsActive = s.IsActive
                               })
                               .ToListAsync();

        return new PagedResultDto<ServiceDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ServiceDto> GetByIdAsync(int id)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null)
        {
            throw new NotFoundException("Không tìm thấy dịch vụ.");
        }

        return new ServiceDto
        {
            Id = service.Id,
            Name = service.Name,
            Description = service.Description,
            DurationMinutes = service.DurationMinutes,
            Price = service.Price,
            IsActive = service.IsActive
        };
    }

    public async Task<ServiceDto> CreateAsync(CreateServiceRequestDto request)
    {
        var service = new Service
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            DurationMinutes = request.DurationMinutes,
            Price = request.Price,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.Services.Add(service);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(service.Id);
    }

    public async Task<ServiceDto> UpdateAsync(int id, UpdateServiceRequestDto request)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null)
        {
            throw new NotFoundException("Không tìm thấy dịch vụ.");
        }

        service.Name = request.Name.Trim();
        service.Description = request.Description?.Trim();
        service.DurationMinutes = request.DurationMinutes;
        service.Price = request.Price;
        service.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return new ServiceDto
        {
            Id = service.Id,
            Name = service.Name,
            Description = service.Description,
            DurationMinutes = service.DurationMinutes,
            Price = service.Price,
            IsActive = service.IsActive
        };
    }
}
