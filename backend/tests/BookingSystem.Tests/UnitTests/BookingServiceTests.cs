using BookingSystem.Api.Common.Exceptions;
using BookingSystem.Api.Data;
using BookingSystem.Api.Hubs;
using BookingSystem.Api.Models.DTOs.Bookings;
using BookingSystem.Api.Models.Entities;
using BookingSystem.Api.Models.Enums;
using BookingSystem.Api.Services.Implementations;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
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

    private IHubContext<BookingHub> CreateMockHubContext()
    {
        var mockHub = new Mock<IHubContext<BookingHub>>();
        var mockClients = new Mock<IHubClients>();
        var mockClientProxy = new Mock<IClientProxy>();

        mockHub.Setup(h => h.Clients).Returns(mockClients.Object);
        mockClients.Setup(c => c.All).Returns(mockClientProxy.Object);

        return mockHub.Object;
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

        var serviceHandler = new BookingService(context, CreateMockHubContext());
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

        var serviceHandler = new BookingService(context, CreateMockHubContext());

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

        var serviceHandler = new BookingService(context, CreateMockHubContext());

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
    public async Task TC4_CancelBooking_CustomerB_TryingToCancelCustomerA_ShouldThrowForbiddenException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var customerA = new User { Id = 1, Email = "a@test.com", FullName = "Cust A", Role = UserRole.Customer };
        var customerB = new User { Id = 2, Email = "b@test.com", FullName = "Cust B", Role = UserRole.Customer };
        var staff = new Staff { Id = 1, Email = "staff@test.com", FullName = "Staff", IsActive = true };
        var service = new Service { Id = 1, Name = "Haircut", DurationMinutes = 30, Price = 100, IsActive = true };

        var booking = new Booking
        {
            Id = 1,
            BookingCode = "BK-A",
            CustomerId = customerA.Id,
            StaffId = staff.Id,
            ServiceId = service.Id,
            StartTime = DateTime.UtcNow.AddDays(1),
            EndTime = DateTime.UtcNow.AddDays(1).AddMinutes(30),
            Status = BookingStatus.Pending
        };

        context.Users.AddRange(customerA, customerB);
        context.Staffs.Add(staff);
        context.Services.Add(service);
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var serviceHandler = new BookingService(context, CreateMockHubContext());

        // Customer B tries to cancel Customer A's booking
        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            serviceHandler.CancelBookingAsync(booking.Id, currentUserId: customerB.Id, isAdmin: false, "Muốn hủy trộm"));

        Assert.Contains("không có quyền", ex.Message);
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

        var serviceHandler = new BookingService(context, CreateMockHubContext());

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            serviceHandler.CancelBookingAsync(booking.Id, customer.Id, isAdmin: false, "Muốn hủy"));

        Assert.Contains("đã hoàn thành", ex.Message);
    }

    [Fact]
    public async Task TC6_CancelPastBooking_ShouldThrowBadRequestException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var customer = new User { Id = 1, Email = "cust@test.com", FullName = "Cust", Role = UserRole.Customer };
        var staff = new Staff { Id = 1, Email = "staff@test.com", FullName = "Staff", IsActive = true };
        var service = new Service { Id = 1, Name = "Haircut", DurationMinutes = 30, Price = 100, IsActive = true };

        var booking = new Booking
        {
            Id = 20,
            BookingCode = "BK-PAST",
            CustomerId = customer.Id,
            StaffId = staff.Id,
            ServiceId = service.Id,
            StartTime = DateTime.UtcNow.AddHours(-1), // Started 1 hour ago
            EndTime = DateTime.UtcNow.AddMinutes(-30),
            Status = BookingStatus.Confirmed
        };

        context.Users.Add(customer);
        context.Staffs.Add(staff);
        context.Services.Add(service);
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var serviceHandler = new BookingService(context, CreateMockHubContext());

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            serviceHandler.CancelBookingAsync(booking.Id, customer.Id, isAdmin: false, "Trễ rồi muốn hủy"));

        Assert.Contains("đã bắt đầu hoặc đã qua", ex.Message);
    }

    [Fact]
    public async Task Bonus5_RaceCondition_ConcurrentBookingsForSameSlot_OnlyOneSucceeds()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var customer1 = new User { Id = 1, Email = "c1@test.com", FullName = "Cust 1", Role = UserRole.Customer };
        var customer2 = new User { Id = 2, Email = "c2@test.com", FullName = "Cust 2", Role = UserRole.Customer };
        var staff = new Staff { Id = 99, Email = "staff99@test.com", FullName = "Staff 99", IsActive = true };
        var service = new Service { Id = 1, Name = "Haircut", DurationMinutes = 30, Price = 100, IsActive = true };

        var targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2));
        var schedule = new WorkSchedule
        {
            StaffId = staff.Id,
            WorkDate = targetDate,
            StartTime = new TimeOnly(8, 0),
            EndTime = new TimeOnly(18, 0)
        };

        context.Users.AddRange(customer1, customer2);
        context.Staffs.Add(staff);
        context.Services.Add(service);
        context.WorkSchedules.Add(schedule);
        await context.SaveChangesAsync();

        var serviceHandler = new BookingService(context, CreateMockHubContext());

        var slotTime = targetDate.ToDateTime(new TimeOnly(10, 0), DateTimeKind.Utc);
        var req1 = new CreateBookingRequestDto { ServiceId = service.Id, StaffId = staff.Id, StartTime = slotTime };
        var req2 = new CreateBookingRequestDto { ServiceId = service.Id, StaffId = staff.Id, StartTime = slotTime };

        // Act: Execute both requests concurrently in parallel
        var task1 = serviceHandler.CreateBookingAsync(customer1.Id, req1);
        var task2 = serviceHandler.CreateBookingAsync(customer2.Id, req2);

        var outcomes = await Task.WhenAll(
            task1.ContinueWith(t => t.IsCompletedSuccessfully ? "Success" : "Conflict"),
            task2.ContinueWith(t => t.IsCompletedSuccessfully ? "Success" : "Conflict")
        );

        // Assert: Exactly one must succeed and one must encounter Conflict
        Assert.Contains("Success", outcomes);
        Assert.Contains("Conflict", outcomes);

        // Verify only 1 booking was created in DB
        var totalBookings = await context.Bookings.CountAsync(b => b.StaffId == staff.Id && b.StartTime == slotTime);
        Assert.Equal(1, totalBookings);
    }
}
