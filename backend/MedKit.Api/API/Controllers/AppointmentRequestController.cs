using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/appointment-requests")]
[Authorize]
public class AppointmentRequestController(AppointmentRequestService appointmentRequestService, AppDbContext ctx) : ControllerBase
{
    private Guid? CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private async Task<(Guid? PatientId, IActionResult? Error)> ResolveCurrentPatientIdAsync()
    {
        var userId = CurrentUserId;
        if (userId is null) return (null, Unauthorized());

        var user = await ctx.Users.FindAsync(userId.Value);
        if (user?.PatientId is null) return (null, Forbid());
        return (user.PatientId.Value, null);
    }

    [HttpGet("my")]
    [Authorize(Roles = "patient")]
    public async Task<IActionResult> GetMy()
    {
        var (patientId, error) = await ResolveCurrentPatientIdAsync();
        if (error is not null) return error;

        var requests = await appointmentRequestService.GetByPatientAsync(patientId!.Value);
        return Ok(requests);
    }

    [HttpPost]
    [Authorize(Roles = "patient")]
    public async Task<IActionResult> Create([FromBody] CreatePatientAppointmentRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = CurrentUserId;
        if (userId is null) return Unauthorized();

        var (patientId, resolveError) = await ResolveCurrentPatientIdAsync();
        if (resolveError is not null) return resolveError;

        var (dto, error) = await appointmentRequestService.CreateAsync(request, patientId!.Value, userId.Value);

        return error switch
        {
            "patient_not_found" => NotFound(new { error = "Pacientul nu a fost găsit." }),
            "invalid_preferred_doctor_id" => BadRequest(new { error = "Identificatorul medicului preferat este invalid." }),
            "preferred_doctor_not_found" => NotFound(new { error = "Medicul preferat nu a fost găsit." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "Cererea de programare nu a putut fi salvată." }),
        };
    }
}