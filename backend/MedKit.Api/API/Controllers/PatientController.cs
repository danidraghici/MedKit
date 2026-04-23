using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/patients")]
[Authorize(Roles = "admin")]
public class PatientController(PatientService patientService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var patients = await patientService.GetAllAsync();
        return Ok(patients);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePatientRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var adminUserId))
            return Unauthorized();

        var (dto, error) = await patientService.CreateAsync(request, adminUserId);

        return error switch
        {
            "email_taken"       => Conflict(new { error = "A user with this email already exists." }),
            "national_id_taken" => Conflict(new { error = "A patient with this national ID already exists." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "Unexpected error." })
        };
    }
}
