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
                Id = p.Id.ToString(),
                FullName = p.FullName,
                DateOfBirth = p.DateOfBirth.ToString("yyyy-MM-dd"),
                Sex = p.Sex == "Masculin" ? "Male" : p.Sex == "Feminin" ? "Female" : p.Sex == "Altul" ? "Other" : p.Sex,
                NationalId = p.NationalId,
                Phone = p.Phone,
                Email = p.Email,
                BloodType = p.BloodType == "Necunoscut" ? "Unknown" : p.BloodType,
                Allergies = p.Allergies ?? "",
                CurrentMedications = p.CurrentMedications ?? "",
                CreatedAt = p.CreatedAt.ToString("O"),
                UpdatedAt = p.UpdatedAt.ToString("O"),
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
                Id = p.Id.ToString(),
                FullName = p.FullName,
                DateOfBirth = p.DateOfBirth.ToString("yyyy-MM-dd"),
                Sex = p.Sex == "Masculin" ? "Male" : p.Sex == "Feminin" ? "Female" : p.Sex == "Altul" ? "Other" : p.Sex,
                NationalId = p.NationalId,
                Phone = p.Phone,
                Email = p.Email,
                BloodType = p.BloodType == "Necunoscut" ? "Unknown" : p.BloodType,
                Allergies = p.Allergies ?? "",
                CurrentMedications = p.CurrentMedications ?? "",
                CreatedAt = p.CreatedAt.ToString("O"),
                UpdatedAt = p.UpdatedAt.ToString("O"),
            })
            .ToListAsync();
    }

    public async Task<PatientDto?> GetByIdAsync(Guid patientId)
    {
        return await ctx.Patients
            .Where(p => p.Id == patientId)
            .Select(p => new PatientDto
            {
                Id = p.Id.ToString(),
                FullName = p.FullName,
                DateOfBirth = p.DateOfBirth.ToString("yyyy-MM-dd"),
                Sex = p.Sex == "Masculin" ? "Male" : p.Sex == "Feminin" ? "Female" : p.Sex == "Altul" ? "Other" : p.Sex,
                NationalId = p.NationalId,
                Phone = p.Phone,
                Email = p.Email,
                BloodType = p.BloodType == "Necunoscut" ? "Unknown" : p.BloodType,
                Allergies = p.Allergies ?? "",
                CurrentMedications = p.CurrentMedications ?? "",
                CreatedAt = p.CreatedAt.ToString("O"),
                UpdatedAt = p.UpdatedAt.ToString("O"),
            })
            .FirstOrDefaultAsync();
    }

    public async Task<List<PatientDto>> GetByLabRequestsAsync()
    {
        return await ctx.Patients
            .Where(p => ctx.LabRequests.Any(lr => lr.PatientId == p.Id))
            .OrderBy(p => p.FullName)
            .Select(p => new PatientDto
            {
                Id = p.Id.ToString(),
                FullName = p.FullName,
                DateOfBirth = p.DateOfBirth.ToString("yyyy-MM-dd"),
                Sex = p.Sex == "Masculin" ? "Male" : p.Sex == "Feminin" ? "Female" : p.Sex == "Altul" ? "Other" : p.Sex,
                NationalId = p.NationalId,
                Phone = p.Phone,
                Email = p.Email,
                BloodType = p.BloodType == "Necunoscut" ? "Unknown" : p.BloodType,
                Allergies = p.Allergies ?? "",
                CurrentMedications = p.CurrentMedications ?? "",
                CreatedAt = p.CreatedAt.ToString("O"),
                UpdatedAt = p.UpdatedAt.ToString("O"),
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

        var normalizedSex = NormalizeSexForStorage(request.Sex);
        if (normalizedSex == null)
            return (null, "invalid_sex");

        var patientId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        var patient = new PatientEntity
        {
            Id = patientId,
            FullName = request.FullName,
            DateOfBirth = DateOnly.Parse(request.DateOfBirth),
            Sex = normalizedSex,
            NationalId = request.NationalId,
            Phone = request.Phone,
            Email = request.Email,
            BloodType = NormalizeBloodTypeForStorage(request.BloodType),
            Allergies = string.IsNullOrEmpty(request.Allergies) ? null : request.Allergies,
            CurrentMedications = string.IsNullOrEmpty(request.CurrentMedications) ? null : request.CurrentMedications,
            CreatedByDoctorId = createdByDoctorId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var userAccount = new UserEntity
        {
            Id = Guid.NewGuid(),
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = BC.HashPassword("MedKit2026!", workFactor: 12),
            Name = request.FullName,
            Role = "patient",
            IsActive = true,
            PatientId = patientId,
            MustChangePassword = true,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await SessionContextHelper.SetAndExecuteAsync(ctx, actingUserId, async () =>
        {
            ctx.Patients.Add(patient);
            ctx.Users.Add(userAccount);
            await ctx.SaveChangesAsync();
        });

        return (new PatientDto
        {
            Id = patient.Id.ToString(),
            FullName = patient.FullName,
            DateOfBirth = patient.DateOfBirth.ToString("yyyy-MM-dd"),
            Sex = MapSexFromStorage(patient.Sex),
            NationalId = patient.NationalId,
            Phone = patient.Phone,
            Email = patient.Email,
            BloodType = MapBloodTypeFromStorage(patient.BloodType),
            Allergies = patient.Allergies ?? "",
            CurrentMedications = patient.CurrentMedications ?? "",
            CreatedAt = patient.CreatedAt.ToString("O"),
            UpdatedAt = patient.UpdatedAt.ToString("O"),
        }, null);
    }

    private static string? NormalizeSexForStorage(string sex)
    {
        return sex.Trim() switch
        {
            "Male" => "Masculin",
            "Female" => "Feminin",
            "Other" => "Altul",
            "Masculin" => "Masculin",
            "Feminin" => "Feminin",
            "Altul" => "Altul",
            _ => null,
        };
    }

    private static string NormalizeBloodTypeForStorage(string bloodType)
    {
        return bloodType.Trim() switch
        {
            "Unknown" => "Necunoscut",
            "Necunoscut" => "Necunoscut",
            _ => bloodType.Trim(),
        };
    }

    private static string MapSexFromStorage(string sex)
    {
        return sex.Trim() switch
        {
            "Masculin" => "Male",
            "Feminin" => "Female",
            "Altul" => "Other",
            _ => sex,
        };
    }

    private static string MapBloodTypeFromStorage(string bloodType)
    {
        return bloodType.Trim() switch
        {
            "Necunoscut" => "Unknown",
            _ => bloodType,
        };
    }
}
