using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/notification-rules")]
[Authorize(Roles = "admin")]
public class NotificationRuleController(NotificationRuleService svc) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rules = await svc.GetAllAsync();
        return Ok(rules);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNotificationRuleRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId)) return Unauthorized();

        var (dto, error) = await svc.CreateAsync(req, userId);
        if (error is not null) return StatusCode(500, new { error = "Unexpected error." });

        return Ok(dto);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateNotificationRuleRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId)) return Unauthorized();

        var (dto, error) = await svc.UpdateAsync(id, req, userId);
        return error switch
        {
            "not_found" => NotFound(new { error = "Notification rule not found." }),
            not null    => StatusCode(500, new { error }),
            _           => Ok(dto)
        };
    }
}
