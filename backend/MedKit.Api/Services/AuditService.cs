using MedKit.Api.Data;
using MedKit.Api.Data.Entities;

namespace MedKit.Api.Services;

public class AuditService(AppDbContext ctx)
{
    public async Task LogLoginAsync(
        Guid userId,
        string outcome,
        string ipAddress,
        string userAgent)
    {
        ctx.AuditLogs.Add(new AuditLogEntity
        {
            PerformedByUserId = outcome == "success" ? userId : null,
            Action = "LOGIN",
            EntityType = "users",
            EntityId = outcome == "success" ? userId : null,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            Metadata = $"{{\"outcome\":\"{outcome}\"}}",
            PerformedAt = DateTimeOffset.UtcNow
        });
        await ctx.SaveChangesAsync();
    }

    public async Task LogLogoutAsync(Guid userId, string ipAddress, string userAgent)
    {
        ctx.AuditLogs.Add(new AuditLogEntity
        {
            PerformedByUserId = userId,
            Action = "LOGOUT",
            EntityType = "users",
            EntityId = userId,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            PerformedAt = DateTimeOffset.UtcNow
        });
        await ctx.SaveChangesAsync();
    }
}
