using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/departments")]
[Authorize(Roles = "admin")]
public class DepartmentController(DepartmentService departmentService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var departments = await departmentService.GetAllAsync();
        return Ok(departments);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDepartmentRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var adminUserId))
            return Unauthorized();

        var (dto, error) = await departmentService.CreateAsync(request, adminUserId);

        return error switch
        {
            "name_taken"          => Conflict(new { error = "name_taken" }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "Unexpected error." })
        };
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDepartmentRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var adminUserId))
            return Unauthorized();

        var (dto, error) = await departmentService.UpdateAsync(id, request, adminUserId);

        return error switch
        {
            "not_found"           => NotFound(new { error = "Department not found." }),
            "name_taken"          => Conflict(new { error = "name_taken" }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "Unexpected error." })
        };
    }
}
