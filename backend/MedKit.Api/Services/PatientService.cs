using MedKit.Api.API.DTOs;
using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using BC = BCrypt.Net.BCrypt;

namespace MedKit.Api.Services;

public class PatientService(AppDbContext ctx)
{
    public async Task<List<PatientDto>> GetAllAsync()
    {
        return await ctx.Patients
            .OrderBy(p => p.FullName)
            .Select(p => new PatientDto
            {
                Id                 = p.Id.ToString(),
                FullName           = p.FullName,
                DateOfBirth        = p.DateOfBirth.ToString("yyyy-MM-dd"),
                Sex                = p.Sex,
                NationalId         = p.NationalId,
                Phone              = p.Phone,
                Email              = p.Email,
                BloodType          = p.BloodType,
                Allergies          = p.Allergies ?? "",
                CurrentMedications = p.CurrentMedications ?? "",
                CreatedAt          = p.CreatedAt.ToString("O"),
                UpdatedAt          = p.UpdatedAt.ToString("O"),
            })
            .ToListAsync();
    }

    public async Task<List<PatientDto>> GetByDoctorAsync(Guid doctorId)
    {
        return await ctx.Patients
            .Where(p =>
                ctx.Appointments.Any(a => a.DoctorId == doctorId && a.PatientId == p.Id) ||
                ctx.MedicalRecords.Any(mr => mr.DoctorId == doctorId && mr.PatientId == p.Id) ||
                p.CreatedByDoctorId == doctorId)
            .OrderBy(p => p.FullName)
            .Select(p => new PatientDto
            {
                Id                 = p.Id.ToString(),
                FullName           = p.FullName,
                DateOfBirth        = p.DateOfBirth.ToString("yyyy-MM-dd"),
                Sex                = p.Sex,
                NationalId         = p.NationalId,
                Phone              = p.Phone,
                Email              = p.Email,
                BloodType          = p.BloodType,
                Allergies          = p.Allergies ?? "",
                CurrentMedications = p.CurrentMedications ?? "",
                CreatedAt          = p.CreatedAt.ToString("O"),
                UpdatedAt          = p.UpdatedAt.ToString("O"),
            })
            .ToListAsync();
    }

    public async Task<(PatientDto? Dto, string? Error)> CreateAsync(
        CreatePatientRequest request,
        Guid actingUserId,
        Guid? createdByDoctorId = null)
    {
        if (await ctx.Users.AnyAsync(u => u.Email == request.Email.ToLowerInvariant()))
            return (null, "email_taken");

        if (await ctx.Patients.AnyAsync(p => p.NationalId == request.NationalId))
            return (null, "national_id_taken");

        var patientId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        var patient = new PatientEntity
        {
            Id                   = patientId,
            FullName             = request.FullName,
            DateOfBirth          = DateOnly.Parse(request.DateOfBirth),
            Sex                  = request.Sex,
            NationalId           = request.NationalId,
            Phone                = request.Phone,
            Email                = request.Email,
            BloodType            = request.BloodType,
            Allergies            = string.IsNullOrEmpty(request.Allergies) ? null : request.Allergies,
            CurrentMedications   = string.IsNullOrEmpty(request.CurrentMedications) ? null : request.CurrentMedications,
            CreatedByDoctorId    = createdByDoctorId,
            CreatedAt            = now,
            UpdatedAt            = now,
        };

        var userAccount = new UserEntity
        {
            Id                 = Guid.NewGuid(),
            Email              = request.Email.ToLowerInvariant(),
            PasswordHash       = BC.HashPassword("MedKit2026!", workFactor: 12),
            Name               = request.FullName,
            Role               = "patient",
            IsActive           = true,
            PatientId          = patientId,
            MustChangePassword = true,
            CreatedAt          = now,
            UpdatedAt          = now,
        };

        await SessionContextHelper.SetAndExecuteAsync(ctx, actingUserId, async () =>
        {
            ctx.Patients.Add(patient);
            ctx.Users.Add(userAccount);
            await ctx.SaveChangesAsync();
        });

        return (new PatientDto
        {
            Id                 = patient.Id.ToString(),
            FullName           = patient.FullName,
            DateOfBirth        = patient.DateOfBirth.ToString("yyyy-MM-dd"),
            Sex                = patient.Sex,
            NationalId         = patient.NationalId,
            Phone              = patient.Phone,
            Email              = patient.Email,
            BloodType          = patient.BloodType,
            Allergies          = patient.Allergies ?? "",
            CurrentMedications = patient.CurrentMedications ?? "",
            CreatedAt          = patient.CreatedAt.ToString("O"),
            UpdatedAt          = patient.UpdatedAt.ToString("O"),
        }, null);
    }
}
