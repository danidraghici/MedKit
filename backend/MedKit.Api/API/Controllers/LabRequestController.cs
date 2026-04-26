using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/lab-requests")]
[Authorize]
public class LabRequestController(LabRequestService labRequestService) : ControllerBase
{
    private Guid? CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    // Lab doctor queue: all non-Completed requests
    [HttpGet]
    [Authorize(Roles = "lab_doctor")]
    public async Task<IActionResult> GetAll()
    {
        var results = await labRequestService.GetAllPendingAsync();
        return Ok(results);
    }

    // Unread badge count for lab doctors
    [HttpGet("unread-count")]
    [Authorize(Roles = "lab_doctor")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var count = await labRequestService.GetUnreadCountAsync();
        return Ok(new { count });
    }

    // All lab requests for a patient (any authenticated role)
    [HttpGet("patient/{patientId:guid}")]
    public async Task<IActionResult> GetByPatient(Guid patientId)
    {
        var results = await labRequestService.GetByPatientAsync(patientId);
        return Ok(results);
    }

    // Lab request linked to a specific medical record (any authenticated role)
    [HttpGet("medical-record/{medicalRecordId:guid}")]
    public async Task<IActionResult> GetByMedicalRecord(Guid medicalRecordId)
    {
        var lookup = await labRequestService.GetByMedicalRecordIdsAsync([medicalRecordId]);
        if (!lookup.TryGetValue(medicalRecordId, out var dto))
            return NotFound(new { error = "Nicio cerere de analize pentru această fișă medicală." });
        return Ok(dto);
    }

    // Update status (Pending → In Progress → Completed)
    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "lab_doctor")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateLabRequestStatusRequest request)
    {
        var userId = CurrentUserId;
        if (userId is null) return Unauthorized();

        var (dto, error) = await labRequestService.UpdateStatusAsync(id, request.Status, userId.Value);
        return error switch
        {
            "not_found"          => NotFound(new { error = "Cererea de analize nu a fost găsită." }),
            "invalid_status"     => BadRequest(new { error = "Valoare de status invalidă." }),
            "invalid_transition" => BadRequest(new { error = "Statusul poate avansa doar înainte: În așteptare → În procesare → Finalizat." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "Actualizarea a eșuat." }),
        };
    }

    // Mark as read (clears unread badge)
    [HttpPatch("{id:guid}/mark-read")]
    [Authorize(Roles = "lab_doctor")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var userId = CurrentUserId;
        if (userId is null) return Unauthorized();

        var error = await labRequestService.MarkReadAsync(id, userId.Value);
        return error switch
        {
            "not_found" => NotFound(new { error = "Cererea de analize nu a fost găsită." }),
            _ => NoContent(),
        };
    }

    // Submit results (observations text and/or file upload)
    [HttpPost("{id:guid}/results")]
    [Authorize(Roles = "lab_doctor")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SubmitResult(
        Guid id,
        [FromForm] string? observations,
        IFormFile? file)
    {
        var userId = CurrentUserId;
        if (userId is null) return Unauthorized();

        var (dto, error) = await labRequestService.SubmitResultAsync(id, userId.Value, observations, file);
        return error switch
        {
            "not_found"                    => NotFound(new { error = "Cererea de analize nu a fost găsită." }),
            "observations_or_file_required" => BadRequest(new { error = "Trebuie furnizate cel puțin observații sau un fișier." }),
            "must_start_processing_first"  => BadRequest(new { error = "Cererea de analize trebuie să fie În procesare înainte de a trimite rezultatele." }),
            "invalid_content_type"         => BadRequest(new { error = "Sunt acceptate doar fișiere PDF, JPEG și PNG." }),
            "file_too_large"               => BadRequest(new { error = "Fișierul nu trebuie să depășească 10 MB." }),
            "patient_not_found"            => NotFound(new { error = "Pacientul nu a fost găsit." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "Trimiterea a eșuat." }),
        };
    }
}
