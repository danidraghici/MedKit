using MedKit.Api.API.DTOs;
using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class DepartmentService(AppDbContext ctx)
{
    public async Task<List<DepartmentDto>> GetAllAsync()
    {
        return await ctx.Departments
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentDto(
                d.Id.ToString(),
                d.Name,
                d.Description ?? "",
                d.CreatedAt.ToString("O"),
                d.UpdatedAt.ToString("O")))
            .ToListAsync();
    }

    public async Task<(DepartmentDto? Dto, string? Error)> CreateAsync(
        CreateDepartmentRequest request,
        Guid adminUserId)
    {
        var nameTrimmed = request.Name.Trim();

        if (await ctx.Departments.AnyAsync(d => d.Name == nameTrimmed))
            return (null, "name_taken");

        var now = DateTimeOffset.UtcNow;
        var entity = new DepartmentEntity
        {
            Id          = Guid.NewGuid(),
            Name        = nameTrimmed,
            Description = request.Description?.Trim(),
            CreatedAt   = now,
            UpdatedAt   = now,
        };

        await SessionContextHelper.SetAndExecuteAsync(ctx, adminUserId, async () =>
        {
            ctx.Departments.Add(entity);
            await ctx.SaveChangesAsync();
        });

        return (new DepartmentDto(
            entity.Id.ToString(),
            entity.Name,
            entity.Description ?? "",
            entity.CreatedAt.ToString("O"),
            entity.UpdatedAt.ToString("O")), null);
    }

    public async Task<(DepartmentDto? Dto, string? Error)> UpdateAsync(
        Guid id,
        UpdateDepartmentRequest request,
        Guid adminUserId)
    {
        var entity = await ctx.Departments.FindAsync(id);
        if (entity is null) return (null, "not_found");

        var nameTrimmed = request.Name.Trim();

        if (await ctx.Departments.AnyAsync(d => d.Name == nameTrimmed && d.Id != id))
            return (null, "name_taken");

        entity.Name        = nameTrimmed;
        entity.Description = request.Description?.Trim();
        entity.UpdatedAt   = DateTimeOffset.UtcNow;

        await SessionContextHelper.SetAndExecuteAsync(ctx, adminUserId, async () =>
        {
            await ctx.SaveChangesAsync();
        });

        return (new DepartmentDto(
            entity.Id.ToString(),
            entity.Name,
            entity.Description ?? "",
            entity.CreatedAt.ToString("O"),
            entity.UpdatedAt.ToString("O")), null);
    }
}
