using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController(DashboardService dashboardService) : ControllerBase
{
    [HttpGet("stats")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await dashboardService.GetStatsAsync();
        return Ok(stats);
    }

    [HttpGet("staff")]
    public async Task<IActionResult> GetStaff()
    {
        var staff = await dashboardService.GetStaffAsync();
        return Ok(staff);
    }
}
