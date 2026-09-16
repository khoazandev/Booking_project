using BookingSystem.Api.Models.Entities;
using BookingSystem.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace BookingSystem.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Ensure database created
        await context.Database.EnsureCreatedAsync();

        if (await context.Users.AnyAsync())
        {
            return; // Data already seeded
        }

        // 1. Seed Users (1 Admin, 2 Customers)
        var adminPassword = BCrypt.Net.BCrypt.HashPassword("Admin123!");
        var customerPassword = BCrypt.Net.BCrypt.HashPassword("Password123!");

        var admin = new User
        {
            Email = "admin@booking.com",
            PasswordHash = adminPassword,
            FullName = "Hệ thống Quản Trị Viên",
            Role = UserRole.Admin,
            CreatedAt = DateTime.UtcNow
        };

        var customer1 = new User
        {
            Email = "customer1@demo.com",
            PasswordHash = customerPassword,
            FullName = "Nguyễn Văn Khách 1",
            Role = UserRole.Customer,
            CreatedAt = DateTime.UtcNow
        };

        var customer2 = new User
        {
            Email = "customer2@demo.com",
            PasswordHash = customerPassword,
            FullName = "Trần Thị Khách 2",
            Role = UserRole.Customer,
            CreatedAt = DateTime.UtcNow
        };

        await context.Users.AddRangeAsync(admin, customer1, customer2);
        await context.SaveChangesAsync();

        // 2. Seed Staffs (2 Staff members)
        var staff1 = new Staff
        {
            FullName = "Lê Văn Thợ Cắt 1",
            Email = "tho1@booking.com",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var staff2 = new Staff
        {
            FullName = "Phạm Thị Thợ Chăm Sóc 2",
            Email = "tho2@booking.com",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await context.Staffs.AddRangeAsync(staff1, staff2);
        await context.SaveChangesAsync();

        // 3. Seed Services (5 Services with different durations & prices)
        var services = new List<Service>
        {
            new Service
            {
                Name = "Cắt tóc nam tiêu chuẩn",
                Description = "Tư vấn kiểu tóc phù hợp, cắt và gội xả sấy tạo kiểu",
                DurationMinutes = 30,
                Price = 100000m,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new Service
            {
                Name = "Gội đầu dưỡng sinh thư giãn",
                Description = "Gội đầu thảo dược kết hợp massage vai gáy bấm huyệt",
                DurationMinutes = 45,
                Price = 150000m,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new Service
            {
                Name = "Chăm sóc da mặt chuyên sâu",
                Description = "Tẩy tế bào chết, hút dầu nhờn, đắp mặt nạ tinh chất Collagen",
                DurationMinutes = 60,
                Price = 300000m,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new Service
            {
                Name = "Massage body trị liệu đá nóng",
                Description = "Massage toàn thân giải tỏa căng thẳng bằng đá bazan tự nhiên",
                DurationMinutes = 90,
                Price = 450000m,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new Service
            {
                Name = "Combo VIP Toàn diện",
                Description = "Trọn gói Cắt tóc + Gội dưỡng sinh + Chăm sóc da + Massage",
                DurationMinutes = 120,
                Price = 750000m,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        };

        await context.Services.AddRangeAsync(services);
        await context.SaveChangesAsync();

        // 4. Seed Work Schedules for next 7 days (08:00 to 18:00)
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var schedules = new List<WorkSchedule>();

        for (int i = 0; i < 7; i++)
        {
            var date = today.AddDays(i);
            schedules.Add(new WorkSchedule
            {
                StaffId = staff1.Id,
                WorkDate = date,
                StartTime = new TimeOnly(8, 0),
                EndTime = new TimeOnly(18, 0)
            });

            schedules.Add(new WorkSchedule
            {
                StaffId = staff2.Id,
                WorkDate = date,
                StartTime = new TimeOnly(8, 0),
                EndTime = new TimeOnly(18, 0)
            });
        }

        await context.WorkSchedules.AddRangeAsync(schedules);
        await context.SaveChangesAsync();

        // 5. Seed 10 sample Bookings with varied statuses
        var tomorrow = DateTime.UtcNow.Date.AddDays(1);
        var dayAfter = DateTime.UtcNow.Date.AddDays(2);

        var sampleBookings = new List<Booking>
        {
            new Booking
            {
                BookingCode = "BK-2026-CONF01",
                CustomerId = customer1.Id,
                ServiceId = services[0].Id, // 30 mins
                StaffId = staff1.Id,
                StartTime = tomorrow.AddHours(9),
                EndTime = tomorrow.AddHours(9).AddMinutes(30),
                Status = BookingStatus.Confirmed,
                CustomerNote = "Đúng giờ giúp tôi",
                CreatedAt = DateTime.UtcNow
            },
            new Booking
            {
                BookingCode = "BK-2026-PEND01",
                CustomerId = customer1.Id,
                ServiceId = services[1].Id, // 45 mins
                StaffId = staff1.Id,
                StartTime = tomorrow.AddHours(10),
                EndTime = tomorrow.AddHours(10).AddMinutes(45),
                Status = BookingStatus.Pending,
                CustomerNote = "Cần thợ nhẹ tay",
                CreatedAt = DateTime.UtcNow
            },
            new Booking
            {
                BookingCode = "BK-2026-CANC01",
                CustomerId = customer1.Id,
                ServiceId = services[2].Id,
                StaffId = staff1.Id,
                StartTime = tomorrow.AddHours(14),
                EndTime = tomorrow.AddHours(15),
                Status = BookingStatus.Cancelled,
                CustomerNote = "Đặt thử",
                CancellationReason = "Bận việc đột xuất",
                CreatedAt = DateTime.UtcNow
            },
            new Booking
            {
                BookingCode = "BK-2026-COMP01",
                CustomerId = customer1.Id,
                ServiceId = services[0].Id,
                StaffId = staff1.Id,
                StartTime = DateTime.UtcNow.Date.AddDays(-1).AddHours(10),
                EndTime = DateTime.UtcNow.Date.AddDays(-1).AddHours(10).AddMinutes(30),
                Status = BookingStatus.Completed,
                CustomerNote = "Đã hoàn thành tốt",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new Booking
            {
                BookingCode = "BK-2026-CONF02",
                CustomerId = customer2.Id,
                ServiceId = services[3].Id, // 90 mins
                StaffId = staff2.Id,
                StartTime = tomorrow.AddHours(8).AddMinutes(30),
                EndTime = tomorrow.AddHours(10),
                Status = BookingStatus.Confirmed,
                CustomerNote = "Yêu cầu phòng yên tĩnh",
                CreatedAt = DateTime.UtcNow
            },
            new Booking
            {
                BookingCode = "BK-2026-PEND02",
                CustomerId = customer2.Id,
                ServiceId = services[1].Id,
                StaffId = staff2.Id,
                StartTime = tomorrow.AddHours(11),
                EndTime = tomorrow.AddHours(11).AddMinutes(45),
                Status = BookingStatus.Pending,
                CustomerNote = null,
                CreatedAt = DateTime.UtcNow
            },
            new Booking
            {
                BookingCode = "BK-2026-COMP02",
                CustomerId = customer2.Id,
                ServiceId = services[2].Id,
                StaffId = staff2.Id,
                StartTime = DateTime.UtcNow.Date.AddDays(-1).AddHours(14),
                EndTime = DateTime.UtcNow.Date.AddDays(-1).AddHours(15),
                Status = BookingStatus.Completed,
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new Booking
            {
                BookingCode = "BK-2026-CANC02",
                CustomerId = customer2.Id,
                ServiceId = services[4].Id,
                StaffId = staff2.Id,
                StartTime = tomorrow.AddHours(15),
                EndTime = tomorrow.AddHours(17),
                Status = BookingStatus.Cancelled,
                CancellationReason = "Thời tiết xấu",
                CreatedAt = DateTime.UtcNow
            },
            new Booking
            {
                BookingCode = "BK-2026-PEND03",
                CustomerId = customer1.Id,
                ServiceId = services[0].Id,
                StaffId = staff1.Id,
                StartTime = dayAfter.AddHours(8).AddMinutes(30),
                EndTime = dayAfter.AddHours(9),
                Status = BookingStatus.Pending,
                CreatedAt = DateTime.UtcNow
            },
            new Booking
            {
                BookingCode = "BK-2026-CONF03",
                CustomerId = customer2.Id,
                ServiceId = services[3].Id,
                StaffId = staff2.Id,
                StartTime = dayAfter.AddHours(13),
                EndTime = dayAfter.AddHours(14).AddMinutes(30),
                Status = BookingStatus.Confirmed,
                CreatedAt = DateTime.UtcNow
            }
        };

        await context.Bookings.AddRangeAsync(sampleBookings);
        await context.SaveChangesAsync();
    }
}
