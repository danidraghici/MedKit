using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/doctors/{doctorId:guid}/schedule")]
[Authorize]
public class DoctorScheduleController(DoctorScheduleService scheduleService, AppDbContext db) : ControllerBase
{
    private Guid? CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private string CurrentRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? "";

    // Verify that a non-admin user's JWT links to the requested doctorId
    private async Task<bool> IsOwnerOrAdmin(Guid doctorId)
    {
        if (CurrentRole == "admin") return true;
        var userId = CurrentUserId;
        if (userId == null) return false;
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        return user?.DoctorId == doctorId;
    }

    // GET /api/doctors/{doctorId}/schedule
    [HttpGet]
    [Authorize(Roles = "admin,specialist_doctor,lab_doctor")]
    public async Task<IActionResult> GetActive(Guid doctorId)
    {
        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "Nu puteți accesa programul altui medic." });

        var entries = await scheduleService.GetActiveAsync(doctorId);
        return Ok(entries);
    }

    // POST /api/doctors/{doctorId}/schedule
    [HttpPost]
    [Authorize(Roles = "admin,specialist_doctor,lab_doctor")]
    public async Task<IActionResult> Create(Guid doctorId, [FromBody] CreateScheduleEntryRequest request)
    {
        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "Nu puteți modifica programul altui medic." });

        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var (dto, error) = await scheduleService.CreateAsync(doctorId, request, userId.Value, CurrentRole);

        return error switch
        {
            "invalid_type" => BadRequest(new { error = "schedule_type trebuie să fie 'working_hours' sau 'block'." }),
            "invalid_day" => BadRequest(new { error = "day_of_week trebuie să fie între 0 și 6 pentru intrările de tip working_hours." }),
            "start_time_required" => BadRequest(new { error = "start_time este obligatoriu când is_working_day este true." }),
            "invalid_time_format" => BadRequest(new { error = "Orele trebuie să fie în formatul HH:mm." }),
            "invalid_date_format" => BadRequest(new { error = "specific_date trebuie să fie o dată validă (yyyy-MM-dd)." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "A apărut o eroare neașteptată." }),
        };
    }

    // PUT /api/doctors/{doctorId}/schedule/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "admin,specialist_doctor,lab_doctor")]
    public async Task<IActionResult> Update(Guid doctorId, Guid id, [FromBody] UpdateScheduleEntryRequest request)
    {
        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "You cannot modify another doctor's schedule." });

        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var (dto, error) = await scheduleService.UpdateAsync(id, doctorId, request, userId.Value, CurrentRole);

        return error switch
        {
            "not_found" => NotFound(new { error = "Intrarea din program nu a fost găsită." }),
            "forbidden" => StatusCode(403, new { error = "Nu puteți modifica această intrare din program." }),
            "invalid_type" => BadRequest(new { error = "schedule_type trebuie să fie 'working_hours' sau 'block'." }),
            "invalid_day" => BadRequest(new { error = "day_of_week trebuie să fie între 0 și 6 pentru intrările de tip working_hours." }),
            "start_time_required" => BadRequest(new { error = "start_time este obligatoriu când is_working_day este true." }),
            "invalid_time_format" => BadRequest(new { error = "Orele trebuie să fie în formatul HH:mm." }),
            "invalid_date_format" => BadRequest(new { error = "specific_date trebuie să fie o dată validă (yyyy-MM-dd)." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "A apărut o eroare neașteptată." }),
        };
    }

    // DELETE /api/doctors/{doctorId}/schedule/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin,specialist_doctor,lab_doctor")]
    public async Task<IActionResult> Delete(Guid doctorId, Guid id)
    {
        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "You cannot modify another doctor's schedule." });

        var error = await scheduleService.DeleteAsync(id, doctorId, CurrentRole);

        return error switch
        {
            "not_found" => NotFound(new { error = "Intrarea din program nu a fost găsită." }),
            "forbidden" => StatusCode(403, new { error = "Administratorii nu pot șterge direct intrările active din program. Propuneți o modificare." }),
            null => NoContent(),
            _ => StatusCode(500, new { error = "A apărut o eroare neașteptată." }),
        };
    }

    // GET /api/doctors/{doctorId}/schedule/available-slots?date=yyyy-MM-dd
    [HttpGet("available-slots")]
    [Authorize(Roles = "admin,specialist_doctor,lab_doctor,patient")]
    public async Task<IActionResult> GetAvailableSlots(Guid doctorId, [FromQuery] string date)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture,
            DateTimeStyles.None, out var parsedDate))
            return BadRequest(new { error = "Format de dată invalid. Folosiți yyyy-MM-dd." });

        var slots = await scheduleService.GetAvailableSlotsAsync(doctorId, parsedDate);
        return Ok(new { slots });
    }

    // GET /api/doctors/{doctorId}/schedule/pending
    [HttpGet("pending")]
    [Authorize(Roles = "admin,specialist_doctor,lab_doctor")]
    public async Task<IActionResult> GetPending(Guid doctorId)
    {
        if (CurrentRole == "admin")
            return StatusCode(403, new { error = "Administratorii nu pot accesa acest endpoint." });

        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "Nu puteți accesa programul altui medic." });

        var entries = await scheduleService.GetPendingForDoctorAsync(doctorId);
        return Ok(entries);
    }

    // GET /api/doctors/{doctorId}/schedule/pending-count
    [HttpGet("pending-count")]
    [Authorize(Roles = "admin,specialist_doctor,lab_doctor")]
    public async Task<IActionResult> GetPendingCount(Guid doctorId)
    {
        if (CurrentRole == "admin")
            return StatusCode(403, new { error = "Administratorii nu pot accesa acest endpoint." });

        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "Nu puteți accesa programul altui medic." });

        var count = await scheduleService.GetPendingCountAsync(doctorId);
        return Ok(new { count });
    }

    // POST /api/doctors/{doctorId}/schedule/{id}/approve
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid doctorId, Guid id)
    {
        if (CurrentRole == "admin")
            return StatusCode(403, new { error = "Administratorii nu pot aproba modificările de program." });

        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "You cannot modify another doctor's schedule." });

        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var (dto, error) = await scheduleService.ApproveAsync(id, doctorId, userId.Value);

        return error switch
        {
            "not_found" => NotFound(new { error = "Intrarea din program nu a fost găsită." }),
            "not_pending" => BadRequest(new { error = "Intrarea nu este în așteptarea aprobării." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "A apărut o eroare neașteptată." }),
        };
    }

    // POST /api/doctors/{doctorId}/schedule/{id}/reject
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid doctorId, Guid id)
    {
        if (CurrentRole == "admin")
            return StatusCode(403, new { error = "Administratorii nu pot respinge modificările de program." });

        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "You cannot modify another doctor's schedule." });

        var error = await scheduleService.RejectAsync(id, doctorId);

        return error switch
        {
            "not_found" => NotFound(new { error = "Intrarea din program nu a fost găsită." }),
            "not_pending" => BadRequest(new { error = "Intrarea nu este în așteptarea aprobării." }),
            null => NoContent(),
            _ => StatusCode(500, new { error = "A apărut o eroare neașteptată." }),
        };
    }
}
