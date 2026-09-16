using System.Text;
using BookingSystem.Api.Common.Middleware;
using BookingSystem.Api.Data;
using BookingSystem.Api.Hubs;
using BookingSystem.Api.Services.Implementations;
using BookingSystem.Api.Services.Interfaces;
using Hangfire;
using Hangfire.MemoryStorage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Configure Database Context (Postgres for production/docker, SQLite for zero-config local dev)
var postgresConn = builder.Configuration.GetConnectionString("PostgresConnection");
var defaultConn = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    if (!string.IsNullOrEmpty(postgresConn) && builder.Environment.IsProduction())
    {
        options.UseNpgsql(postgresConn);
    }
    else
    {
        options.UseSqlite(defaultConn ?? "Data Source=booking.db");
    }
});

// 2. Register Application Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IServiceManagementService, ServiceManagementService>();
builder.Services.AddScoped<IStaffScheduleService, StaffScheduleService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IExpiredBookingScannerService, ExpiredBookingScannerService>();

// 3. BONUS 3: Register SignalR
builder.Services.AddSignalR();

// 4. BONUS 4: Register Hangfire with In-Memory Storage
builder.Services.AddHangfire(config =>
{
    config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
          .UseSimpleAssemblyNameTypeSerializer()
          .UseDefaultTypeSerializer()
          .UseMemoryStorage();
});
builder.Services.AddHangfireServer();

// 5. Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "super_secret_jwt_key_booking_service_management_2026_demo_key_12345";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "BookingSystemApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "BookingSystemClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ClockSkew = TimeSpan.Zero
    };

    // Support token in query string for SignalR web sockets
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// 6. Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 7. Add Controllers & Swagger with JWT support
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Service Booking Management API",
        Version = "v1",
        Description = "Hệ thống Quản lý Đặt lịch Dịch vụ (Full-Stack Demo API with SignalR & Hangfire)"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập token JWT theo định dạng: Bearer {your_token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// 8. Auto-migrate & Seed Database on startup
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await DbInitializer.SeedAsync(context);
}

// 9. Configure HTTP request pipeline
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

if (app.Environment.IsDevelopment() || true) // Enable Swagger in demo
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Booking API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// 10. BONUS 4: Configure Hangfire Dashboard & Recurring Job
app.UseHangfireDashboard("/hangfire");
RecurringJob.AddOrUpdate<IExpiredBookingScannerService>(
    "auto-cancel-expired-pending-bookings",
    service => service.CancelExpiredPendingBookingsAsync(),
    Cron.Minutely);

// 11. Map Controllers & SignalR Hub
app.MapControllers();
app.MapHub<BookingHub>("/hubs/booking");

app.Run();
