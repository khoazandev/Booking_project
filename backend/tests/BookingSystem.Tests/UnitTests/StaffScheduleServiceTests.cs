using BookingSystem.Api.Common.Exceptions;
using BookingSystem.Api.Data;
using BookingSystem.Api.Models.DTOs.Staffs;
using BookingSystem.Api.Models.Entities;
using BookingSystem.Api.Services.Implementations;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace BookingSystem.Tests.UnitTests;

public class StaffScheduleServiceTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task CreateStaff_ValidData_ShouldCreateSuccessfully()
    {
        using var context = CreateInMemoryDbContext();
        var service = new StaffScheduleService(context);

        var request = new CreateStaffRequestDto
        {
            FullName = "Nguyễn Văn Chuyên Viên",
            Email = "chuyenvien@booking.com",
            IsActive = true
        };

        var result = await service.CreateStaffAsync(request);

        Assert.NotNull(result);
        Assert.True(result.Id > 0);
        Assert.Equal("Nguyễn Văn Chuyên Viên", result.FullName);
        Assert.Equal("chuyenvien@booking.com", result.Email);
        Assert.True(result.IsActive);

        var dbStaff = await context.Staffs.FindAsync(result.Id);
        Assert.NotNull(dbStaff);
    }

    [Fact]
    public async Task CreateStaff_DuplicateEmail_ShouldThrowConflictException()
    {
        using var context = CreateInMemoryDbContext();
        context.Staffs.Add(new Staff
        {
            FullName = "Thợ Cũ",
            Email = "duplicate@booking.com",
            IsActive = true
        });
        await context.SaveChangesAsync();

        var service = new StaffScheduleService(context);

        var request = new CreateStaffRequestDto
        {
            FullName = "Thợ Mới",
            Email = "duplicate@booking.com",
            IsActive = true
        };

        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.CreateStaffAsync(request));
        Assert.Contains("đã tồn tại", ex.Message);
    }
}
