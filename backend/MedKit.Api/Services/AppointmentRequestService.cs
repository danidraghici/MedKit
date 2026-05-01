using MedKit.Api.API.DTOs;
using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class AppointmentRequestService(AppDbContext db)
{
    private static string NormalizeStatusForClient(string dbStatus) => dbStatus switch
    {
        "În așteptare" or "Pending" => "Pending",
        "Aprobat" or "Approved" => "Approved",
        "Respins" or "Rejected" => "Rejected",
        _ => dbStatus,
    };

    public async Task<List<AppointmentRequestDto>> GetByPatientAsync(Guid patientId)
    {
        return await (
            from request in db.AppointmentRequests
            join patient in db.Patients on request.PatientId equals patient.Id
            join doctor in db.Doctors on request.PreferredDoctorId equals doctor.Id into doctorJoin
            from preferredDoctor in doctorJoin.DefaultIfEmpty()
            where request.PatientId == patientId
            orderby request.CreatedAt descending
            select new AppointmentRequestDto
            {
                Id = request.Id.ToString(),
                PatientId = request.PatientId.ToString(),
                PatientName = patient.FullName,
                RequestedDate = request.RequestedDate.ToString("yyyy-MM-dd"),
                RequestedTime = request.RequestedTime,
                Type = request.Type,
                Reason = request.Reason,
                PreferredDoctor = preferredDoctor != null ? preferredDoctor.Name : null,
                PreferredDoctorId = request.PreferredDoctorId.HasValue ? request.PreferredDoctorId.Value.ToString() : null,
                Status = NormalizeStatusForClient(request.Status),
                CreatedAt = request.CreatedAt.ToString("O"),
                ResponseNote = request.ResponseNote,
            }
        ).ToListAsync();
    }

    public async Task<(AppointmentRequestDto? Dto, string? Error)> CreateAsync(
        CreatePatientAppointmentRequest request,
        Guid patientId,
        Guid userId)
    {
        var patient = await db.Patients.FindAsync(patientId);
        if (patient is null) return (null, "patient_not_found");

        Guid? preferredDoctorId = null;
        DoctorEntity? preferredDoctor = null;
        if (!string.IsNullOrWhiteSpace(request.PreferredDoctorId))
        {
            if (!Guid.TryParse(request.PreferredDoctorId, out var parsedDoctorId))
                return (null, "invalid_preferred_doctor_id");

            preferredDoctor = await db.Doctors.FindAsync(parsedDoctorId);
            if (preferredDoctor is null) return (null, "preferred_doctor_not_found");
            preferredDoctorId = parsedDoctorId;
        }

        var now = DateTimeOffset.UtcNow;
        var entity = new AppointmentRequestEntity
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            RequestedDate = DateOnly.Parse(request.RequestedDate),
            RequestedTime = request.RequestedTime,
            Type = request.Type,
            Reason = request.Reason.Trim(),
            PreferredDoctorId = preferredDoctorId,
            Status = "În așteptare",
            CreatedAt = now,
            UpdatedAt = now,
        };

        await SessionContextHelper.SetAndExecuteAsync(db, userId, async () =>
        {
            db.AppointmentRequests.Add(entity);
            await db.SaveChangesAsync();
        });

        return (new AppointmentRequestDto
        {
            Id = entity.Id.ToString(),
            PatientId = entity.PatientId.ToString(),
            PatientName = patient.FullName,
            RequestedDate = entity.RequestedDate.ToString("yyyy-MM-dd"),
            RequestedTime = entity.RequestedTime,
            Type = entity.Type,
            Reason = entity.Reason,
            PreferredDoctor = preferredDoctor?.Name,
            PreferredDoctorId = entity.PreferredDoctorId?.ToString(),
            Status = "Pending",
            CreatedAt = entity.CreatedAt.ToString("O"),
            ResponseNote = entity.ResponseNote,
        }, null);
    }
}