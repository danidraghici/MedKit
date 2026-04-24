using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UserProfileController(UserProfileService profileService) : ControllerBase
{
    private Guid? CurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    // GET /api/users/me
    [HttpGet("me")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var profile = await profileService.GetProfileAsync(userId.Value);
        if (profile is null) return NotFound();

        return Ok(profile);
    }

    // PUT /api/users/me
    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var profile = await profileService.UpdateProfileAsync(userId.Value, request);
        if (profile is null) return NotFound();

        return Ok(profile);
    }
}
