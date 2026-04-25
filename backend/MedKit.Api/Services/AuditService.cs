using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

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

    public async Task<List<AuditLogDto>> GetLogsAsync(int limit = 200)
    {
        return await (
            from log in ctx.AuditLogs
            join user in ctx.Users on log.PerformedByUserId equals user.Id into userJoin
            from u in userJoin.DefaultIfEmpty()
            orderby log.PerformedAt descending
            select new AuditLogDto(
                log.Id.ToString(),
                log.PerformedByUserId.HasValue ? log.PerformedByUserId.Value.ToString() : null,
                u != null ? u.Name : null,
                log.Action,
                log.EntityType,
                log.EntityId.HasValue ? log.EntityId.Value.ToString() : null,
                log.OldValues,
                log.NewValues,
                log.IpAddress,
                log.Metadata,
                log.PerformedAt)
        ).Take(limit).ToListAsync();
    }
}
