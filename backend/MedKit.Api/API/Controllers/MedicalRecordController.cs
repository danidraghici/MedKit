using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/medical-records")]
[Authorize(Roles = "admin,specialist_doctor")]
public class MedicalRecordController(MedicalRecordService medicalRecordService) : ControllerBase
{
    [HttpGet("patient/{patientId:guid}")]
    public async Task<IActionResult> GetByPatient(Guid patientId)
    {
        var records = await medicalRecordService.GetByPatientAsync(patientId);
        return Ok(records);
    }

    [HttpPut("{id:guid}")]
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
            "not_found"    => NotFound(new { error = "Medical record not found." }),
            "forbidden"    => StatusCode(403, new { error = "You can only edit your own records." }),
            "not_a_doctor" => BadRequest(new { error = "User is not associated with a doctor profile." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "Unexpected error." }),
        };
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateMedicalRecordRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var (dto, error) = await medicalRecordService.CreateAsync(request, userId);

        return error switch
        {
            "not_a_doctor"       => BadRequest(new { error = "User is not associated with a doctor profile." }),
            "patient_not_found"  => NotFound(new { error = "Patient not found." }),
            "invalid_patient_id" => BadRequest(new { error = "Invalid patient ID." }),
            "invalid_date"       => BadRequest(new { error = "Invalid date format." }),
            null when dto is not null => CreatedAtAction(
                nameof(GetByPatient), new { patientId = dto.PatientId }, dto),
            _ => StatusCode(500, new { error = "Unexpected error." }),
        };
    }
}
