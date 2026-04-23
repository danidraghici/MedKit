using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/doctors")]
[Authorize(Roles = "admin")]
public class DoctorController(DoctorService doctorService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDoctorRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var adminUserId))
            return Unauthorized();

        var (dto, error) = await doctorService.CreateAsync(request, adminUserId);

        return error switch
        {
            "email_taken"   => Conflict(new { error = "email_taken" }),
            "license_taken" => Conflict(new { error = "license_taken" }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "Unexpected error." })
        };
    }
}
