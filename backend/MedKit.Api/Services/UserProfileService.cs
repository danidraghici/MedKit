using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class UserProfileService(AppDbContext ctx)
{
    public async Task<UserProfileDto?> GetProfileAsync(Guid userId)
    {
        var user = await ctx.Users
            .Include(u => u.Profile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return null;

        var doctor = user.DoctorId.HasValue
            ? await ctx.Doctors.Include(d => d.DepartmentNav).FirstOrDefaultAsync(d => d.Id == user.DoctorId.Value)
            : null;

        return ToDto(user, doctor);
    }

    public async Task<UserProfileDto?> UpdateProfileAsync(Guid userId, UpdateUserProfileRequest req)
    {
        var user = await ctx.Users
            .Include(u => u.Profile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return null;

        var doctor = user.DoctorId.HasValue
            ? await ctx.Doctors.Include(d => d.DepartmentNav).FirstOrDefaultAsync(d => d.Id == user.DoctorId.Value)
            : null;

        user.Name = req.Name;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        if (user.Profile is null)
        {
            user.Profile = new UserProfileEntity
            {
                UserId = userId,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            ctx.UserProfiles.Add(user.Profile);
        }

        var p = user.Profile;
        p.Phone = req.Phone;
        p.Specialty = req.Specialty;
        p.LicenseNumber = req.LicenseNumber;
        p.Department = req.Department;
        p.Hospital = req.Hospital;
        p.Location = req.Location;
        p.Bio = req.Bio;
        p.YearsExperience = req.YearsExperience;
        p.Languages = req.Languages;
        p.UpdatedAt = DateTimeOffset.UtcNow;

        await ctx.SaveChangesAsync();
        return ToDto(user, doctor);
    }

    public async Task UpdateLastLoginAsync(Guid userId)
    {
        var profile = await ctx.UserProfiles.FindAsync(userId);
        if (profile is null)
        {
            ctx.UserProfiles.Add(new UserProfileEntity
            {
                UserId = userId,
                LastLoginAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            });
        }
        else
        {
            profile.LastLoginAt = DateTimeOffset.UtcNow;
            profile.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await ctx.SaveChangesAsync();
    }

    private static UserProfileDto ToDto(Models.Entities.UserEntity user, Models.Entities.DoctorEntity? doctor = null)
    {
        var p = user.Profile;
        return new UserProfileDto
        {
            Id = user.Id.ToString(),
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            Phone = p?.Phone,
            Specialty = p?.Specialty ?? doctor?.Specialty,
            LicenseNumber = p?.LicenseNumber ?? doctor?.LicenseNumber,
            Department = p?.Department ?? doctor?.DepartmentNav?.Name,
            Hospital = p?.Hospital,
            Location = p?.Location,
            Bio = p?.Bio,
            YearsExperience = p?.YearsExperience,
            Languages = p?.Languages,
            JoinedDate = user.CreatedAt,
            LastLoginAt = p?.LastLoginAt,
        };
    }
}
