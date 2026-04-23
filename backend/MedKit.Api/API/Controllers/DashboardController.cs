using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = "admin")]
public class DashboardController(DashboardService dashboardService) : ControllerBase
{
    [HttpGet("stats")]
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
