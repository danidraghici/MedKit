using System.Security.Claims;
using MedKit.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/consultation-reminders")]
[Authorize(Roles = "patient")]
public class ConsultationReminderController(AppDbContext db) : ControllerBase
{
    private async Task<Guid?> ResolveCurrentPatientIdAsync()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId)) return null;
        var user = await db.Users.FindAsync(userId);
        return user?.PatientId;
    }

    // GET /api/consultation-reminders
    [HttpGet]
    public async Task<IActionResult> GetActive()
    {
        var patientId = await ResolveCurrentPatientIdAsync();
        if (patientId is null) return Unauthorized();

        var reminders = await db.ConsultationReminders
            .Where(r => r.PatientId == patientId && !r.Dismissed)
            .OrderBy(r => r.DueDate)
            .ToListAsync();

        return Ok(reminders.Select(r => new
        {
            id        = r.Id,
            patientId = r.PatientId,
            type      = r.Type,
            title     = r.Title,
            message   = r.Message,
            dueDate   = r.DueDate.ToString("yyyy-MM-dd"),
            priority  = r.Priority,
            dismissed = r.Dismissed,
            createdAt = r.CreatedAt,
        }));
    }

    // PATCH /api/consultation-reminders/{id}/dismiss
    [HttpPatch("{id:guid}/dismiss")]
    public async Task<IActionResult> Dismiss(Guid id)
    {
        var patientId = await ResolveCurrentPatientIdAsync();
        if (patientId is null) return Unauthorized();

        var reminder = await db.ConsultationReminders.FindAsync(id);
        if (reminder is null || reminder.PatientId != patientId)
            return NotFound(new { error = "Memento-ul nu a fost găsit." });

        reminder.Dismissed = true;
        reminder.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { success = true });
    }
}
