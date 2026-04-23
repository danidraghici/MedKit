using MedKit.Api.API.DTOs;
using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using BC = BCrypt.Net.BCrypt;

namespace MedKit.Api.Services;

public class DoctorService(AppDbContext ctx)
{
    public async Task<(DoctorSummaryDto? Dto, string? Error)> CreateAsync(
        CreateDoctorRequest request,
        Guid adminUserId)
    {
        if (await ctx.Users.AnyAsync(u => u.Email == request.Email.ToLowerInvariant()))
            return (null, "email_taken");

        if (await ctx.Doctors.AnyAsync(d => d.LicenseNumber == request.LicenseNumber))
            return (null, "license_taken");

        var doctorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        var doctor = new DoctorEntity
        {
            Id            = doctorId,
            Name          = request.Name,
            Email         = request.Email.ToLowerInvariant(),
            Phone         = request.Phone,
            Specialty     = request.Specialty,
            Department    = request.Department,
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

        return (new DoctorSummaryDto(
            doctor.Id.ToString(),
            doctor.Name,
            doctor.Email,
            doctor.Phone,
            doctor.LicenseNumber,
            doctor.Specialty,
            doctor.Department,
            doctor.DoctorRole), null);
    }
}
