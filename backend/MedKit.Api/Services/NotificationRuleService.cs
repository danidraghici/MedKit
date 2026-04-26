using MedKit.Api.API.DTOs;
using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class NotificationRuleService(AppDbContext ctx, NotificationDeliveryService deliveryService)
{
    public async Task<List<NotificationRuleDto>> GetAllAsync()
    {
        var rules = await ctx.NotificationRules
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return rules.Select(ToDto).ToList();
    }

    public async Task<List<NotificationRuleDto>> GetApplicableAsync(string userRole)
    {
        var audiences = userRole switch
        {
            "specialist_doctor" or "lab_doctor" => new[] { "all", "doctors" },
            "admin"                              => new[] { "all", "admins" },
            _                                    => Array.Empty<string>()
        };

        var rules = await ctx.NotificationRules
            .Where(r => r.IsActive && audiences.Contains(r.TargetAudience))
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
            TriggerEvent = req.TriggerEvent,
            CreatedBy = createdBy,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        await SessionContextHelper.SetAndExecuteAsync(ctx, createdBy, async () =>
        {
            ctx.NotificationRules.Add(rule);
            await ctx.SaveChangesAsync();
        });

        // For general announcements, broadcast immediately to the target audience
        if (rule.TriggerEvent == "general" && rule.IsActive)
            await deliveryService.DeliverGeneralAsync(rule);

        return (ToDto(rule), null);
    }

    public async Task<(NotificationRuleDto? Dto, string? Error)> UpdateAsync(
        Guid id, UpdateNotificationRuleRequest req, Guid updatedBy)
    {
        var rule = await ctx.NotificationRules.FindAsync(id);
        if (rule is null) return (null, "not_found");

        var wasInactive = !rule.IsActive;

        rule.Title = req.Title.Trim();
        rule.Description = req.Description?.Trim();
        rule.TargetAudience = req.TargetAudience;
        rule.IsActive = req.IsActive;
        rule.TriggerEvent = req.TriggerEvent;
        rule.UpdatedAt = DateTimeOffset.UtcNow;

        await SessionContextHelper.SetAndExecuteAsync(ctx, updatedBy, async () =>
        {
            await ctx.SaveChangesAsync();
        });

        // Broadcast if a general rule was just activated
        if (rule.TriggerEvent == "general" && rule.IsActive && wasInactive)
            await deliveryService.DeliverGeneralAsync(rule);

        return (ToDto(rule), null);
    }

    private static NotificationRuleDto ToDto(NotificationRuleEntity r) => new()
    {
        Id = r.Id.ToString(),
        Title = r.Title,
        Description = r.Description,
        TargetAudience = r.TargetAudience,
        IsActive = r.IsActive,
        TriggerEvent = r.TriggerEvent,
        CreatedById = r.CreatedBy.ToString(),
        CreatedAt = r.CreatedAt,
        UpdatedAt = r.UpdatedAt,
    };
}
