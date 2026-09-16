using BookingSystem.Api.Common.Exceptions;
using BookingSystem.Api.Data;
using BookingSystem.Api.Models.DTOs.Bookings;
using BookingSystem.Api.Models.Entities;
using BookingSystem.Api.Models.Enums;
using BookingSystem.Api.Services.Implementations;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace BookingSystem.Tests.UnitTests;

public class BookingServiceTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task TC1_CreateBooking_InPast_ShouldThrowBadRequestException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var customer = new User { Id = 1, Email = "cust@test.com", FullName = "Cust", Role = UserRole.Customer };
        var staff = new Staff { Id = 1, Email = "staff@test.com", FullName = "Staff", IsActive = true };
        var service = new Service { Id = 1, Name = "Haircut", DurationMinutes = 30, Price = 100, IsActive = true };

        context.Users.Add(customer);
        context.Staffs.Add(staff);
        context.Services.Add(service);
        await context.SaveChangesAsync();

        var serviceHandler = new BookingService(context);
        var pastTime = DateTime.UtcNow.AddHours(-2);

        var request = new CreateBookingRequestDto
        {
            ServiceId = service.Id,
            StaffId = staff.Id,
            StartTime = pastTime,
            CustomerNote = "Past booking"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            serviceHandler.CreateBookingAsync(customer.Id, request));

        Assert.Contains("lớn hơn thời điểm hiện tại", ex.Message);
    }

    [Fact]
    public async Task TC2_CreateBooking_OutsideWorkSchedule_ShouldThrowBadRequestException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var customer = new User { Id = 1, Email = "cust@test.com", FullName = "Cust", Role = UserRole.Customer };
        var staff = new Staff { Id = 1, Email = "staff@test.com", FullName = "Staff", IsActive = true };
        var service = new Service { Id = 1, Name = "Haircut", DurationMinutes = 60, Price = 100, IsActive = true };

        var targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var schedule = new WorkSchedule
        {
            StaffId = staff.Id,
            WorkDate = targetDate,
            StartTime = new TimeOnly(9, 0),
            EndTime = new TimeOnly(17, 0)
        };

        context.Users.Add(customer);
        context.Staffs.Add(staff);
        context.Services.Add(service);
        context.WorkSchedules.Add(schedule);
        await context.SaveChangesAsync();

        var serviceHandler = new BookingService(context);

        // Booking starting at 16:30 for 60 mins -> ends at 17:30 (exceeds 17:00)
        var startTime = targetDate.ToDateTime(new TimeOnly(16, 30), DateTimeKind.Utc);

        var request = new CreateBookingRequestDto
        {
            ServiceId = service.Id,
            StaffId = staff.Id,
            StartTime = startTime,
            CustomerNote = "Outside schedule"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            serviceHandler.CreateBookingAsync(customer.Id, request));

        Assert.Contains("ngoài ca làm việc", ex.Message);
    }

    [Fact]
    public async Task TC3_CreateBooking_OverlappingExistingBooking_ShouldThrowConflictException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var customer = new User { Id = 1, Email = "cust@test.com", FullName = "Cust", Role = UserRole.Customer };
        var staff = new Staff { Id = 1, Email = "staff@test.com", FullName = "Staff", IsActive = true };
        var service = new Service { Id = 1, Name = "Haircut", DurationMinutes = 60, Price = 100, IsActive = true };

        var targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var schedule = new WorkSchedule
        {
            StaffId = staff.Id,
            WorkDate = targetDate,
            StartTime = new TimeOnly(8, 0),
            EndTime = new TimeOnly(18, 0)
        };

        // Existing booking from 09:00 to 10:00
        var existingBooking = new Booking
        {
            BookingCode = "BK-EXISTING",
            CustomerId = customer.Id,
            StaffId = staff.Id,
            ServiceId = service.Id,
            StartTime = targetDate.ToDateTime(new TimeOnly(9, 0), DateTimeKind.Utc),
            EndTime = targetDate.ToDateTime(new TimeOnly(10, 0), DateTimeKind.Utc),
            Status = BookingStatus.Confirmed
        };

        context.Users.Add(customer);
        context.Staffs.Add(staff);
        context.Services.Add(service);
        context.WorkSchedules.Add(schedule);
        context.Bookings.Add(existingBooking);
        await context.SaveChangesAsync();

        var serviceHandler = new BookingService(context);

        // New requested booking: 09:30 to 10:30 (overlaps with 09:00 - 10:00)
        var newRequest = new CreateBookingRequestDto
        {
            ServiceId = service.Id,
            StaffId = staff.Id,
            StartTime = targetDate.ToDateTime(new TimeOnly(9, 30), DateTimeKind.Utc),
            CustomerNote = "Conflicting booking"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            serviceHandler.CreateBookingAsync(customer.Id, newRequest));

        Assert.Contains("lịch hẹn", ex.Message);
    }

    [Fact]
    public async Task AdjacentBooking_ShouldSucceedWithoutConflict()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var customer = new User { Id = 1, Email = "cust@test.com", FullName = "Cust", Role = UserRole.Customer };
        var staff = new Staff { Id = 1, Email = "staff@test.com", FullName = "Staff", IsActive = true };
        var service = new Service { Id = 1, Name = "Haircut", DurationMinutes = 60, Price = 100, IsActive = true };

        var targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var schedule = new WorkSchedule
        {
            StaffId = staff.Id,
            WorkDate = targetDate,
            StartTime = new TimeOnly(8, 0),
            EndTime = new TimeOnly(18, 0)
        };

        // Existing booking from 09:00 to 10:00
        var existingBooking = new Booking
        {
            BookingCode = "BK-EXISTING-2",
            CustomerId = customer.Id,
            StaffId = staff.Id,
            ServiceId = service.Id,
            StartTime = targetDate.ToDateTime(new TimeOnly(9, 0), DateTimeKind.Utc),
            EndTime = targetDate.ToDateTime(new TimeOnly(10, 0), DateTimeKind.Utc),
            Status = BookingStatus.Confirmed
        };

        context.Users.Add(customer);
        context.Staffs.Add(staff);
        context.Services.Add(service);
        context.WorkSchedules.Add(schedule);
        context.Bookings.Add(existingBooking);
        await context.SaveChangesAsync();

        var serviceHandler = new BookingService(context);

        // Adjacent booking starting exactly at 10:00 to 11:00
        var adjacentRequest = new CreateBookingRequestDto
        {
            ServiceId = service.Id,
            StaffId = staff.Id,
            StartTime = targetDate.ToDateTime(new TimeOnly(10, 0), DateTimeKind.Utc),
            CustomerNote = "Adjacent booking"
        };

        // Act
        var result = await serviceHandler.CreateBookingAsync(customer.Id, adjacentRequest);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(BookingStatus.Pending, result.Status);
    }

    [Fact]
    public async Task TC6_CancelCompletedBooking_ShouldThrowBadRequestException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var customer = new User { Id = 1, Email = "cust@test.com", FullName = "Cust", Role = UserRole.Customer };
        var staff = new Staff { Id = 1, Email = "staff@test.com", FullName = "Staff", IsActive = true };
        var service = new Service { Id = 1, Name = "Haircut", DurationMinutes = 30, Price = 100, IsActive = true };

        var booking = new Booking
        {
            Id = 10,
            BookingCode = "BK-COMPLETED",
            CustomerId = customer.Id,
            StaffId = staff.Id,
            ServiceId = service.Id,
            StartTime = DateTime.UtcNow.AddHours(2),
            EndTime = DateTime.UtcNow.AddHours(2).AddMinutes(30),
            Status = BookingStatus.Completed
        };

        context.Users.Add(customer);
        context.Staffs.Add(staff);
        context.Services.Add(service);
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var serviceHandler = new BookingService(context);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            serviceHandler.CancelBookingAsync(booking.Id, customer.Id, isAdmin: false, "Muốn hủy"));

        Assert.Contains("đã hoàn thành", ex.Message);
    }
}
