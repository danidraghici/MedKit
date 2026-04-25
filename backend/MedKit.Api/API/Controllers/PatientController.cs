using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/patients")]
[Authorize]
public class PatientController(PatientService patientService, AppDbContext ctx) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetAll()
    {
        var patients = await patientService.GetAllAsync();
        return Ok(patients);
    }

    [HttpGet("my")]
    [Authorize(Roles = "admin,specialist_doctor,lab_doctor")]
    public async Task<IActionResult> GetMy()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role == "admin")
            return Ok(await patientService.GetAllAsync());

        if (role == "lab_doctor")
            return Ok(await patientService.GetByLabRequestsAsync());

        var user = await ctx.Users.FindAsync(userId);
        if (user?.DoctorId is null)
            return Forbid();

        return Ok(await patientService.GetByDoctorAsync(user.DoctorId.Value));
    }

    [HttpPost]
    [Authorize(Roles = "admin,specialist_doctor")]
    public async Task<IActionResult> Create([FromBody] CreatePatientRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var actingUserId))
            return Unauthorized();

        Guid? doctorId = null;
        if (User.FindFirstValue(ClaimTypes.Role) != "admin")
        {
            var user = await ctx.Users.FindAsync(actingUserId);
            doctorId = user?.DoctorId;
        }

        var (dto, error) = await patientService.CreateAsync(request, actingUserId, doctorId);

        return error switch
        {
            "email_taken"       => Conflict(new { error = "A user with this email already exists." }),
            "national_id_taken" => Conflict(new { error = "A patient with this national ID already exists." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "Unexpected error." })
        };
    }
}
