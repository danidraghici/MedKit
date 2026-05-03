using System.Security.Claims;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api")]
public class LabResultController(LabResultService labResultService) : ControllerBase
{
    [HttpGet("lab-results")]
    [Authorize(Roles = "lab_doctor,admin")]
    public async Task<IActionResult> GetAll()
    {
        var results = await labResultService.GetAllAsync();
        return Ok(results);
    }

    [HttpGet("patients/{patientId:guid}/lab-results")]
    [Authorize]
    public async Task<IActionResult> GetByPatient(Guid patientId)
    {
        var results = await labResultService.GetByPatientAsync(patientId);
        return Ok(results);
    }

    [HttpPost("patients/{patientId:guid}/lab-results")]
    [Authorize(Roles = "lab_doctor")]
    public async Task<IActionResult> Upload(Guid patientId, IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var (dto, error) = await labResultService.UploadAsync(patientId, userId, file);

        return error switch
        {
            "invalid_content_type" => BadRequest(new { error = "Only PDF, JPEG, and PNG files are accepted." }),
            "file_too_large"       => BadRequest(new { error = "File must not exceed 10 MB." }),
            "patient_not_found"    => NotFound(new { error = "Patient not found." }),
            null when dto is not null => CreatedAtAction(nameof(GetByPatient), new { patientId }, dto),
            _ => StatusCode(500, new { error = "Upload failed. Please try again." }),
        };
    }

    [HttpGet("lab-results/{id:guid}/file")]
    [Authorize]
    public async Task<IActionResult> GetFile(Guid id)
    {
        var result = await labResultService.GetFileStreamAsync(id);
        if (result is null)
            return NotFound(new { error = "Lab result not found." });

        var (stream, contentType, originalFileName) = result.Value;
        return File(stream, contentType, originalFileName);
    }

    [HttpGet("lab-results/{id:guid}/processing-status")]
    [Authorize]
    public async Task<IActionResult> GetProcessingStatus(Guid id)
    {
        var status = await labResultService.GetProcessingStatusAsync(id);
        if (status is null)
            return NotFound(new { error = "Lab result not found." });
        return Ok(status);
    }

    [HttpGet("lab-results/{id:guid}/insight")]
    [Authorize]
    public async Task<IActionResult> GetInsight(Guid id)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        var isPatient = role == "patient";
        var insight = await labResultService.GetInsightAsync(id, isPatient);
        if (insight is null)
            return NotFound(new { error = "Insight not available." });
        return Ok(insight);
    }
}
