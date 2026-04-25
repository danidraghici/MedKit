using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = "admin")]
public class AuditLogController(AuditService auditService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetLogs([FromQuery] int limit = 200)
    {
        var logs = await auditService.GetLogsAsync(Math.Clamp(limit, 1, 500));
        return Ok(logs);
    }
}
