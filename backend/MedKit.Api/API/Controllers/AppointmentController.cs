using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/appointments")]
[Authorize(Roles = "admin,specialist_doctor")]
public class AppointmentController(AppointmentService appointmentService, AppDbContext ctx) : ControllerBase
{
    private async Task<(Guid? DoctorId, IActionResult? Error)> ResolveCallerDoctorIdAsync()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId)) return (null, Unauthorized());

        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role == "admin") return (null, null);

        var user = await ctx.Users.FindAsync(userId);
        if (user?.DoctorId is null) return (null, Forbid());
        return (user.DoctorId, null);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var (doctorId, error) = await ResolveCallerDoctorIdAsync();
        if (error is not null) return error;

        var stats = await appointmentService.GetStatsAsync(doctorId);
        return Ok(stats);
    }

    [HttpGet("profile-stats")]
    public async Task<IActionResult> GetProfileStats()
    {
        var (doctorId, error) = await ResolveCallerDoctorIdAsync();
        if (error is not null) return error;
        if (doctorId is null) return Forbid();

        var stats = await appointmentService.GetProfileStatsAsync(doctorId.Value);
        return Ok(stats);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var (doctorId, error) = await ResolveCallerDoctorIdAsync();
        if (error is not null) return error;

        var appointments = await appointmentService.GetAllAsync(doctorId);
        return Ok(appointments);
    }

    [HttpGet("patient/{patientId:guid}")]
    public async Task<IActionResult> GetByPatient(Guid patientId)
    {
        var (doctorId, error) = await ResolveCallerDoctorIdAsync();
        if (error is not null) return error;

        var list = await appointmentService.GetByPatientAsync(patientId, doctorId);
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAppointmentRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var (dto, error) = await appointmentService.CreateAsync(request, userId);

        return error switch
        {
            "patient_not_found"  => NotFound(new { error = "Pacientul nu a fost găsit." }),
            "doctor_not_found"   => NotFound(new { error = "Medicul nu a fost găsit." }),
            null when dto is not null => CreatedAtAction(nameof(GetAll), dto),
            _ => StatusCode(500, new { error = "Eroare neașteptată." }),
        };
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateAppointmentStatusRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var error = await appointmentService.UpdateStatusAsync(id, request.Status, userId);

        return error switch
        {
            "not_found"           => NotFound(new { message = "Programarea nu a fost găsită." }),
            "already_programat"   => Conflict(new { message = "Programarea este deja planificată." }),
            "already_finalizat"   => Conflict(new { message = "Programarea este deja finalizată." }),
            "already_anulat"      => Conflict(new { message = "Programarea este deja anulată." }),
            null                  => Ok(new { message = "Statusul a fost actualizat." }),
            _                     => StatusCode(500, new { message = "Eroare neașteptată." }),
        };
    }
}
