using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/doctors/{doctorId:guid}/schedule")]
[Authorize(Roles = "admin,specialist_doctor,lab_doctor")]
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
    public async Task<IActionResult> GetActive(Guid doctorId)
    {
        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "You cannot access another doctor's schedule." });

        var entries = await scheduleService.GetActiveAsync(doctorId);
        return Ok(entries);
    }

    // POST /api/doctors/{doctorId}/schedule
    [HttpPost]
    public async Task<IActionResult> Create(Guid doctorId, [FromBody] CreateScheduleEntryRequest request)
    {
        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "You cannot modify another doctor's schedule." });

        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var (dto, error) = await scheduleService.CreateAsync(doctorId, request, userId.Value, CurrentRole);

        return error switch
        {
            "invalid_type"        => BadRequest(new { error = "schedule_type must be 'working_hours' or 'block'." }),
            "invalid_day"         => BadRequest(new { error = "day_of_week must be 0–6 for working_hours entries." }),
            "start_time_required" => BadRequest(new { error = "start_time is required when is_working_day is true." }),
            "invalid_time_format" => BadRequest(new { error = "Times must be in HH:mm format." }),
            "invalid_date_format" => BadRequest(new { error = "specific_date must be a valid date string (yyyy-MM-dd)." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "An unexpected error occurred." }),
        };
    }

    // PUT /api/doctors/{doctorId}/schedule/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid doctorId, Guid id, [FromBody] UpdateScheduleEntryRequest request)
    {
        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "You cannot modify another doctor's schedule." });

        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var (dto, error) = await scheduleService.UpdateAsync(id, doctorId, request, userId.Value, CurrentRole);

        return error switch
        {
            "not_found"           => NotFound(new { error = "Schedule entry not found." }),
            "forbidden"           => StatusCode(403, new { error = "You cannot modify this schedule entry." }),
            "invalid_type"        => BadRequest(new { error = "schedule_type must be 'working_hours' or 'block'." }),
            "invalid_day"         => BadRequest(new { error = "day_of_week must be 0–6 for working_hours entries." }),
            "start_time_required" => BadRequest(new { error = "start_time is required when is_working_day is true." }),
            "invalid_time_format" => BadRequest(new { error = "Times must be in HH:mm format." }),
            "invalid_date_format" => BadRequest(new { error = "specific_date must be a valid date string (yyyy-MM-dd)." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "An unexpected error occurred." }),
        };
    }

    // DELETE /api/doctors/{doctorId}/schedule/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid doctorId, Guid id)
    {
        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "You cannot modify another doctor's schedule." });

        var error = await scheduleService.DeleteAsync(id, doctorId, CurrentRole);

        return error switch
        {
            "not_found" => NotFound(new { error = "Schedule entry not found." }),
            "forbidden" => StatusCode(403, new { error = "Admins cannot directly delete active schedule entries. Propose a change instead." }),
            null        => NoContent(),
            _           => StatusCode(500, new { error = "An unexpected error occurred." }),
        };
    }

    // GET /api/doctors/{doctorId}/schedule/available-slots?date=yyyy-MM-dd
    [HttpGet("available-slots")]
    public async Task<IActionResult> GetAvailableSlots(Guid doctorId, [FromQuery] string date)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", null,
                System.Globalization.DateTimeStyles.None, out var parsedDate))
            return BadRequest(new { error = "Invalid date format. Use yyyy-MM-dd." });

        var slots = await scheduleService.GetAvailableSlotsAsync(doctorId, parsedDate);
        return Ok(new { slots });
    }

    // GET /api/doctors/{doctorId}/schedule/pending
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending(Guid doctorId)
    {
        if (CurrentRole == "admin")
            return StatusCode(403, new { error = "Admins cannot access this endpoint." });

        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "You cannot access another doctor's schedule." });

        var entries = await scheduleService.GetPendingForDoctorAsync(doctorId);
        return Ok(entries);
    }

    // GET /api/doctors/{doctorId}/schedule/pending-count
    [HttpGet("pending-count")]
    public async Task<IActionResult> GetPendingCount(Guid doctorId)
    {
        if (CurrentRole == "admin")
            return StatusCode(403, new { error = "Admins cannot access this endpoint." });

        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "You cannot access another doctor's schedule." });

        var count = await scheduleService.GetPendingCountAsync(doctorId);
        return Ok(new { count });
    }

    // POST /api/doctors/{doctorId}/schedule/{id}/approve
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid doctorId, Guid id)
    {
        if (CurrentRole == "admin")
            return StatusCode(403, new { error = "Admins cannot approve schedule changes." });

        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "You cannot modify another doctor's schedule." });

        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var (dto, error) = await scheduleService.ApproveAsync(id, doctorId, userId.Value);

        return error switch
        {
            "not_found"   => NotFound(new { error = "Schedule entry not found." }),
            "not_pending" => BadRequest(new { error = "Entry is not awaiting approval." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "An unexpected error occurred." }),
        };
    }

    // POST /api/doctors/{doctorId}/schedule/{id}/reject
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid doctorId, Guid id)
    {
        if (CurrentRole == "admin")
            return StatusCode(403, new { error = "Admins cannot reject schedule changes." });

        if (!await IsOwnerOrAdmin(doctorId))
            return StatusCode(403, new { error = "You cannot modify another doctor's schedule." });

        var error = await scheduleService.RejectAsync(id, doctorId);

        return error switch
        {
            "not_found"   => NotFound(new { error = "Schedule entry not found." }),
            "not_pending" => BadRequest(new { error = "Entry is not awaiting approval." }),
            null          => NoContent(),
            _             => StatusCode(500, new { error = "An unexpected error occurred." }),
        };
    }
}
