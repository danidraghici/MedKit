using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/appointments")]
[Authorize(Roles = "admin,specialist_doctor")]
public class AppointmentController(AppointmentService appointmentService) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await appointmentService.GetStatsAsync();
        return Ok(stats);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var appointments = await appointmentService.GetAllAsync();
        return Ok(appointments);
    }

    [HttpGet("patient/{patientId:guid}")]
    public async Task<IActionResult> GetByPatient(Guid patientId)
    {
        var list = await appointmentService.GetByPatientAsync(patientId);
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
            "patient_not_found"  => NotFound(new { error = "Patient not found." }),
            "doctor_not_found"   => NotFound(new { error = "Doctor not found." }),
            null when dto is not null => CreatedAtAction(nameof(GetAll), dto),
            _ => StatusCode(500, new { error = "Unexpected error." }),
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
            "not_found"           => NotFound(new { message = "Appointment not found." }),
            "already_completed"   => Conflict(new { message = "Appointment is already completed." }),
            "already_cancelled"   => Conflict(new { message = "Appointment is already cancelled." }),
            "already_scheduled"   => Conflict(new { message = "Appointment is already scheduled." }),
            null                  => Ok(new { message = "Status updated." }),
            _                     => StatusCode(500, new { message = "Unexpected error." }),
        };
    }
}
