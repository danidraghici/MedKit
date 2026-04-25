using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/notes")]
[Authorize(Roles = "admin,specialist_doctor")]
public class NoteController(NoteService noteService) : ControllerBase
{
    [HttpGet("patient/{patientId:guid}")]
    public async Task<IActionResult> GetByPatient(Guid patientId)
    {
        var notes = await noteService.GetByPatientAsync(patientId);
        return Ok(notes);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNoteRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var (dto, error) = await noteService.CreateAsync(request, userId);

        return error switch
        {
            "not_a_doctor"      => BadRequest(new { error = "User is not associated with a doctor profile." }),
            "patient_not_found" => NotFound(new { error = "Patient not found." }),
            "invalid_patient_id" => BadRequest(new { error = "Invalid patient ID." }),
            null when dto is not null => CreatedAtAction(nameof(GetByPatient), new { patientId = dto.PatientId }, dto),
            _ => StatusCode(500, new { error = "Unexpected error." }),
        };
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateNoteRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var error = await noteService.UpdateAsync(id, request.Content, userId, User.IsInRole("admin"));

        return error switch
        {
            "not_found" => NotFound(new { error = "Note not found." }),
            "forbidden"  => StatusCode(403, new { error = "You can only edit your own notes." }),
            null         => Ok(new { message = "Note updated." }),
            _            => StatusCode(500, new { error = "Unexpected error." }),
        };
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var error = await noteService.DeleteAsync(id, userId, User.IsInRole("admin"));

        return error switch
        {
            "not_found" => NotFound(new { error = "Note not found." }),
            "forbidden"  => StatusCode(403, new { error = "You can only delete your own notes." }),
            null         => Ok(new { message = "Note deleted." }),
            _            => StatusCode(500, new { error = "Unexpected error." }),
        };
    }
}
