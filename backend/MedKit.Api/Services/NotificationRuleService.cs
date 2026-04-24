using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class NotificationRuleService(AppDbContext ctx)
{
    public async Task<List<NotificationRuleDto>> GetAllAsync()
    {
        var rules = await ctx.NotificationRules
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return rules.Select(ToDto).ToList();
    }

    public async Task<(NotificationRuleDto? Dto, string? Error)> CreateAsync(
        CreateNotificationRuleRequest req, Guid createdBy)
    {
        var rule = new NotificationRuleEntity
        {
            Id = Guid.NewGuid(),
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            TargetAudience = req.TargetAudience,
            IsActive = req.IsActive,
            CreatedBy = createdBy,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        ctx.NotificationRules.Add(rule);
        await ctx.SaveChangesAsync();

        return (ToDto(rule), null);
    }

    public async Task<(NotificationRuleDto? Dto, string? Error)> UpdateAsync(
        Guid id, UpdateNotificationRuleRequest req, Guid updatedBy)
    {
        var rule = await ctx.NotificationRules.FindAsync(id);
        if (rule is null) return (null, "not_found");

        rule.Title = req.Title.Trim();
        rule.Description = req.Description?.Trim();
        rule.TargetAudience = req.TargetAudience;
        rule.IsActive = req.IsActive;
        rule.UpdatedAt = DateTimeOffset.UtcNow;

        await ctx.SaveChangesAsync();

        return (ToDto(rule), null);
    }

    private static NotificationRuleDto ToDto(NotificationRuleEntity r) => new()
    {
        Id = r.Id.ToString(),
        Title = r.Title,
        Description = r.Description,
        TargetAudience = r.TargetAudience,
        IsActive = r.IsActive,
        CreatedById = r.CreatedBy.ToString(),
        CreatedAt = r.CreatedAt,
        UpdatedAt = r.UpdatedAt,
    };
}
