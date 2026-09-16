using BookingSystem.Api.Models.Entities;
using BookingSystem.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace BookingSystem.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Staff> Staffs => Set<Staff>();
    public DbSet<WorkSchedule> WorkSchedules => Set<WorkSchedule>();
    public DbSet<Booking> Bookings => Set<Booking>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User Configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired().HasMaxLength(100);
            entity.Property(u => u.FullName).IsRequired().HasMaxLength(100);
            entity.Property(u => u.PasswordHash).IsRequired().HasMaxLength(255);
            entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
        });

        // Service Configuration
        modelBuilder.Entity<Service>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Name).IsRequired().HasMaxLength(150);
            entity.Property(s => s.Description).HasMaxLength(500);
            entity.Property(s => s.Price).HasPrecision(18, 2);
        });

        // Staff Configuration
        modelBuilder.Entity<Staff>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.HasIndex(s => s.Email).IsUnique();
            entity.Property(s => s.FullName).IsRequired().HasMaxLength(100);
            entity.Property(s => s.Email).IsRequired().HasMaxLength(100);
        });

        // WorkSchedule Configuration
        modelBuilder.Entity<WorkSchedule>(entity =>
        {
            entity.HasKey(w => w.Id);
            entity.HasOne(w => w.Staff)
                  .WithMany(s => s.WorkSchedules)
                  .HasForeignKey(w => w.StaffId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(w => new { w.StaffId, w.WorkDate });
        });

        // Booking Configuration
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.HasIndex(b => b.BookingCode).IsUnique();
            entity.Property(b => b.BookingCode).IsRequired().HasMaxLength(30);
            entity.Property(b => b.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(b => b.CustomerNote).HasMaxLength(500);
            entity.Property(b => b.CancellationReason).HasMaxLength(500);

            entity.HasOne(b => b.Customer)
                  .WithMany(u => u.Bookings)
                  .HasForeignKey(b => b.CustomerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(b => b.Service)
                  .WithMany(s => s.Bookings)
                  .HasForeignKey(b => b.ServiceId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(b => b.Staff)
                  .WithMany(s => s.Bookings)
                  .HasForeignKey(b => b.StaffId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Composite Index for conflict detection query acceleration
            entity.HasIndex(b => new { b.StaffId, b.Status, b.StartTime, b.EndTime })
                  .HasDatabaseName("IX_Bookings_ConflictCheck");
        });
    }
}
