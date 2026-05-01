using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/medical-records")]
[Authorize]
public class MedicalRecordController(MedicalRecordService medicalRecordService, AppDbContext ctx) : ControllerBase
{
    [HttpGet("patient/{patientId:guid}")]
    public async Task<IActionResult> GetByPatient(Guid patientId)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role == "patient")
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var user = await ctx.Users.FindAsync(userId);
            if (user?.PatientId is null || user.PatientId.Value != patientId)
                return Forbid();
        }

        var records = await medicalRecordService.GetByPatientAsync(patientId);
        return Ok(records);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "admin,specialist_doctor")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMedicalRecordRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        bool isAdmin = User.IsInRole("admin");

        var (dto, error) = await medicalRecordService.UpdateAsync(id, request, userId, isAdmin);

        return error switch
        {
            "not_found"    => NotFound(new { error = "Fișa medicală nu a fost găsită." }),
            "forbidden"    => StatusCode(403, new { error = "Puteți edita doar propriile fișe medicale." }),
            "not_a_doctor" => BadRequest(new { error = "Utilizatorul nu este asociat cu un profil de medic." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "Eroare neașteptată." }),
        };
    }

    [HttpPost]
    [Authorize(Roles = "admin,specialist_doctor")]
    public async Task<IActionResult> Create([FromBody] CreateMedicalRecordRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var (dto, error) = await medicalRecordService.CreateAsync(request, userId);

        return error switch
        {
            "not_a_doctor"       => BadRequest(new { error = "Utilizatorul nu este asociat cu un profil de medic." }),
            "patient_not_found"  => NotFound(new { error = "Pacientul nu a fost găsit." }),
            "invalid_patient_id" => BadRequest(new { error = "ID pacient invalid." }),
            "invalid_date"       => BadRequest(new { error = "Format de dată invalid." }),
            null when dto is not null => CreatedAtAction(
                nameof(GetByPatient), new { patientId = dto.PatientId }, dto),
            _ => StatusCode(500, new { error = "Eroare neașteptată." }),
        };
    }
}
