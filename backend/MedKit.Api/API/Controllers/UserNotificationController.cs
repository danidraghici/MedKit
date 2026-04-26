using System.Security.Claims;
using MedKit.Api.Models;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize(Roles = "admin,specialist_doctor,lab_doctor")]
public class UserNotificationController(AppDbContext db) : ControllerBase
{
    private Guid? CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    // GET /api/notifications
    [HttpGet]
    public async Task<IActionResult> GetRecent()
    {
        var userId = CurrentUserId;
        if (userId is null) return Unauthorized();

        var items = await db.UserNotifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToListAsync();

        return Ok(items.Select(NotificationDeliveryService.ToDto));
    }

    // GET /api/notifications/count
    [HttpGet("count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = CurrentUserId;
        if (userId is null) return Unauthorized();

        var count = await db.UserNotifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);

        return Ok(new { count });
    }

    // PUT /api/notifications/read-all  (must come before {id} route to avoid ambiguity)
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = CurrentUserId;
        if (userId is null) return Unauthorized();

        await db.UserNotifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

        return Ok(new { success = true });
    }

    // PUT /api/notifications/{id}/read
    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var userId = CurrentUserId;
        if (userId is null) return Unauthorized();

        var notif = await db.UserNotifications.FindAsync(id);
        if (notif is null || notif.UserId != userId)
            return NotFound(new { error = "Notification not found." });

        notif.IsRead = true;
        await db.SaveChangesAsync();
        return Ok(NotificationDeliveryService.ToDto(notif));
    }
}
