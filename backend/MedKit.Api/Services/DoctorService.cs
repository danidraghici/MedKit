using MedKit.Api.API.DTOs;
using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using BC = BCrypt.Net.BCrypt;

namespace MedKit.Api.Services;

public class DoctorService(AppDbContext ctx)
{
    public async Task<(DoctorSummaryDto? Dto, string? Error)> UpdateAsync(
        Guid doctorId,
        UpdateDoctorRequest request,
        Guid adminUserId)
    {
        var doctor = await ctx.Doctors.FindAsync(doctorId);
        if (doctor is null) return (null, "not_found");

        if (await ctx.Users.AnyAsync(u => u.Email == request.Email.ToLowerInvariant() && u.DoctorId != doctorId))
            return (null, "email_taken");

        if (await ctx.Doctors.AnyAsync(d => d.LicenseNumber == request.LicenseNumber && d.Id != doctorId))
            return (null, "license_taken");

        if (!await ctx.Departments.AnyAsync(d => d.Id == request.DepartmentId))
            return (null, "department_not_found");

        await SessionContextHelper.SetAndExecuteAsync(ctx, adminUserId, async () =>
        {
            doctor.Name          = request.Name;
            doctor.Email         = request.Email.ToLowerInvariant();
            doctor.Phone         = request.Phone;
            doctor.Specialty     = request.Specialty;
            doctor.DepartmentId  = request.DepartmentId;
            doctor.LicenseNumber = request.LicenseNumber;
            doctor.DoctorRole    = request.DoctorRole;

            var user = await ctx.Users.FirstOrDefaultAsync(u => u.DoctorId == doctorId);
            if (user is not null)
            {
                user.Name      = request.Name;
                user.Email     = request.Email.ToLowerInvariant();
                user.Role      = request.DoctorRole;
                user.UpdatedAt = DateTimeOffset.UtcNow;
            }

            await ctx.SaveChangesAsync();
        });

        var dept = await ctx.Departments.FindAsync(request.DepartmentId);

        return (new DoctorSummaryDto(
            doctor.Id.ToString(),
            doctor.Name,
            doctor.Email,
            doctor.Phone,
            doctor.LicenseNumber,
            doctor.Specialty,
            doctor.DepartmentId?.ToString() ?? "",
            dept?.Name ?? "",
            doctor.DoctorRole), null);
    }

    public async Task<(DoctorSummaryDto? Dto, string? Error)> CreateAsync(
        CreateDoctorRequest request,
        Guid adminUserId)
    {
        if (await ctx.Users.AnyAsync(u => u.Email == request.Email.ToLowerInvariant()))
            return (null, "email_taken");

        if (await ctx.Doctors.AnyAsync(d => d.LicenseNumber == request.LicenseNumber))
            return (null, "license_taken");

        if (!await ctx.Departments.AnyAsync(d => d.Id == request.DepartmentId))
            return (null, "department_not_found");

        var doctorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        var doctor = new DoctorEntity
        {
            Id            = doctorId,
            Name          = request.Name,
            Email         = request.Email.ToLowerInvariant(),
            Phone         = request.Phone,
            Specialty     = request.Specialty,
            DepartmentId  = request.DepartmentId,
            LicenseNumber = request.LicenseNumber,
            DoctorRole    = request.DoctorRole,
        };

        var userAccount = new UserEntity
        {
            Id                 = Guid.NewGuid(),
            Email              = request.Email.ToLowerInvariant(),
            PasswordHash       = BC.HashPassword("MedKit2026!", workFactor: 12),
            Name               = request.Name,
            Role               = request.DoctorRole,
            IsActive           = true,
            DoctorId           = doctorId,
            MustChangePassword = true,
            CreatedAt          = now,
            UpdatedAt          = now,
        };

        await SessionContextHelper.SetAndExecuteAsync(ctx, adminUserId, async () =>
        {
            ctx.Doctors.Add(doctor);
            ctx.Users.Add(userAccount);
            await ctx.SaveChangesAsync();
        });

        var dept = await ctx.Departments.FindAsync(request.DepartmentId);

        return (new DoctorSummaryDto(
            doctor.Id.ToString(),
            doctor.Name,
            doctor.Email,
            doctor.Phone,
            doctor.LicenseNumber,
            doctor.Specialty,
            doctor.DepartmentId?.ToString() ?? "",
            dept?.Name ?? "",
            doctor.DoctorRole), null);
    }
}
