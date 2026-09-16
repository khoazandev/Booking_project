using System.Net;
using System.Text.Json;
using BookingSystem.Api.Common.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace BookingSystem.Api.Common.Middleware;

public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

    public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        _logger.LogError(exception, "An unhandled exception occurred: {Message}", exception.Message);

        var statusCode = HttpStatusCode.InternalServerError;
        var title = "Lỗi máy chủ nội bộ";
        var detail = "Đã xảy ra lỗi không mong muốn trong quá trình xử lý yêu cầu.";

        if (exception is AppException appEx)
        {
            statusCode = (HttpStatusCode)appEx.StatusCode;
            title = appEx switch
            {
                NotFoundException => "Không tìm thấy dữ liệu",
                ConflictException => "Xung đột dữ liệu / Trùng lịch",
                ForbiddenException => "Truy cập bị từ chối",
                BadRequestException => "Dữ liệu không hợp lệ",
                _ => "Yêu cầu không thể thực hiện"
            };
            detail = appEx.Message;
        }

        var problemDetails = new ProblemDetails
        {
            Status = (int)statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        };

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = (int)statusCode;

        var json = JsonSerializer.Serialize(problemDetails, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
