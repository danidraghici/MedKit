using MedKit.Api.API.DTOs;
using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace MedKit.Api.Services;

public class AppointmentRequestService(AppDbContext db)
{
    private const string AppointmentRequestTypeConstraint = "CK_appointment_requests_type";

    private static string NormalizeStatusForClient(string dbStatus) => dbStatus switch
    {
        "În așteptare" or "Pending" => "Pending",
        "Aprobat" or "Approved" => "Approved",
        "Respins" or "Rejected" => "Rejected",
        _ => dbStatus,
    };

    private static string[] GetTypeCandidates(string requestType)
    {
        var trimmedType = requestType.Trim();

        return trimmedType switch
        {
            "Consultație generală" or "General Consultation" => ["Consultație generală", "General Consultation"],
            "Consult" or "Follow-up" => ["Consult", "Follow-up"],
            "Revizuire analize" or "Lab Review" => ["Revizuire analize", "Lab Review"],
            "Urgență" or "Emergency" => ["Urgență", "Emergency"],
            "Telemedicină" or "Telemedicine" => ["Telemedicină", "Telemedicine"],
            "Trimitere specialist" or "Specialist Referral" => ["Trimitere specialist", "Specialist Referral"],
            "Control anual" or "Annual Check-up" => ["Control anual", "Annual Check-up"],
            _ => [trimmedType],
        };
    }

    private static bool IsAppointmentRequestTypeConstraint(DbUpdateException exception)
        => exception.InnerException is SqlException sqlException
           && sqlException.Message.Contains(AppointmentRequestTypeConstraint, StringComparison.OrdinalIgnoreCase);

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
            RequestedDate = DateOnly.ParseExact(request.RequestedDate, "yyyy-MM-dd", CultureInfo.InvariantCulture),
            RequestedTime = request.RequestedTime,
            Type = request.Type.Trim(),
            Reason = request.Reason.Trim(),
            PreferredDoctorId = preferredDoctorId,
            Status = "În așteptare",
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.AppointmentRequests.Add(entity);

        var typeCandidates = GetTypeCandidates(request.Type);
        DbUpdateException? lastTypeConstraintException = null;

        foreach (var typeCandidate in typeCandidates)
        {
            entity.Type = typeCandidate;

            try
            {
                await SessionContextHelper.SetAndExecuteAsync(db, userId, async () =>
                {
                    await db.SaveChangesAsync();
                });

                lastTypeConstraintException = null;
                break;
            }
            catch (DbUpdateException exception) when (IsAppointmentRequestTypeConstraint(exception))
            {
                lastTypeConstraintException = exception;
            }
        }

        if (lastTypeConstraintException is not null)
        {
            throw lastTypeConstraintException;
        }

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
            Status = NormalizeStatusForClient(entity.Status),
            CreatedAt = entity.CreatedAt.ToString("O"),
            ResponseNote = entity.ResponseNote,
        }, null);
    }
}