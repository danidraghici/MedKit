using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/notes")]
[Authorize]
public class NoteController(NoteService noteService, AppDbContext ctx) : ControllerBase
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

        var notes = await noteService.GetByPatientAsync(patientId);
        return Ok(notes);
    }

    [HttpPost]
    [Authorize(Roles = "admin,specialist_doctor")]
    public async Task<IActionResult> Create([FromBody] CreateNoteRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var (dto, error) = await noteService.CreateAsync(request, userId);

        return error switch
        {
            "not_a_doctor"      => BadRequest(new { error = "Utilizatorul nu este asociat cu un profil de medic." }),
            "patient_not_found" => NotFound(new { error = "Pacientul nu a fost găsit." }),
            "invalid_patient_id" => BadRequest(new { error = "ID pacient invalid." }),
            null when dto is not null => CreatedAtAction(nameof(GetByPatient), new { patientId = dto.PatientId }, dto),
            _ => StatusCode(500, new { error = "Eroare neașteptată." }),
        };
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "admin,specialist_doctor")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateNoteRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var error = await noteService.UpdateAsync(id, request.Content, userId, User.IsInRole("admin"));

        return error switch
        {
            "not_found" => NotFound(new { error = "Nota nu a fost găsită." }),
            "forbidden"  => StatusCode(403, new { error = "Puteți edita doar propriile note." }),
            null         => Ok(new { message = "Nota a fost actualizată." }),
            _            => StatusCode(500, new { error = "Eroare neașteptată." }),
        };
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin,specialist_doctor")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var error = await noteService.DeleteAsync(id, userId, User.IsInRole("admin"));

        return error switch
        {
            "not_found" => NotFound(new { error = "Nota nu a fost găsită." }),
            "forbidden"  => StatusCode(403, new { error = "Puteți șterge doar propriile note." }),
            null         => Ok(new { message = "Nota a fost ștearsă." }),
            _            => StatusCode(500, new { error = "Eroare neașteptată." }),
        };
    }
}
