using MedKit.Api.API.DTOs;
using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class AppointmentService(AppDbContext db)
{
    public async Task<AppointmentStatsDto> GetStatsAsync(Guid? doctorId = null)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var thirtyDaysAgo = today.AddDays(-30);
        var thirtyDaysFromNow = today.AddDays(30);
        var nextWeek = today.AddDays(7);

        var totalNext30Days = await db.Appointments
            .CountAsync(a => a.AppointmentDate >= today && a.AppointmentDate <= thirtyDaysFromNow
                          && (doctorId == null || a.DoctorId == doctorId));

        var completedLast30Days = await db.Appointments
            .CountAsync(a => a.Status == "Completed" && a.AppointmentDate >= thirtyDaysAgo
                          && (doctorId == null || a.DoctorId == doctorId));

        var todayCount = await db.Appointments
            .CountAsync(a => a.AppointmentDate == today && a.Status == "Scheduled"
                          && (doctorId == null || a.DoctorId == doctorId));

        var nextWeekCount = await db.Appointments
            .CountAsync(a => a.AppointmentDate >= today && a.AppointmentDate <= nextWeek && a.Status == "Scheduled"
                          && (doctorId == null || a.DoctorId == doctorId));

        return new AppointmentStatsDto(totalNext30Days, completedLast30Days, todayCount, nextWeekCount);
    }

    public async Task<List<AppointmentDto>> GetAllAsync(Guid? doctorId = null)
    {
        return await (
            from a in db.Appointments
            join p in db.Patients on a.PatientId equals p.Id
            join d in db.Doctors  on a.DoctorId  equals d.Id
            where doctorId == null || a.DoctorId == doctorId
            orderby a.AppointmentDate descending, a.AppointmentTime
            select new AppointmentDto
            {
                Id          = a.Id.ToString(),
                PatientId   = a.PatientId.ToString(),
                PatientName = p.FullName,
                DoctorId    = a.DoctorId.ToString(),
                Doctor      = d.Name,
                Date        = a.AppointmentDate.ToString("yyyy-MM-dd"),
                Time        = a.AppointmentTime,
                Type        = a.Type,
                Status      = a.Status,
                Notes       = a.Notes,
            }
        ).ToListAsync();
    }

    public async Task<List<AppointmentDto>> GetByPatientAsync(Guid patientId, Guid? doctorId = null)
    {
        var oneYearAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-1));
        return await (
            from a in db.Appointments
            join p in db.Patients on a.PatientId equals p.Id
            join d in db.Doctors  on a.DoctorId  equals d.Id
            where a.PatientId == patientId && a.AppointmentDate >= oneYearAgo
               && (doctorId == null || a.DoctorId == doctorId)
            orderby a.AppointmentDate descending, a.AppointmentTime
            select new AppointmentDto
            {
                Id          = a.Id.ToString(),
                PatientId   = a.PatientId.ToString(),
                PatientName = p.FullName,
                DoctorId    = a.DoctorId.ToString(),
                Doctor      = d.Name,
                Date        = a.AppointmentDate.ToString("yyyy-MM-dd"),
                Time        = a.AppointmentTime,
                Type        = a.Type,
                Status      = a.Status,
                Notes       = a.Notes,
            }
        ).ToListAsync();
    }

    public async Task<string?> UpdateStatusAsync(Guid id, string status, Guid userId)
    {
        var appt = await db.Appointments.FirstOrDefaultAsync(a => a.Id == id);
        if (appt is null) return "not_found";
        if (appt.Status == status) return "already_" + status.ToLower();

        await SessionContextHelper.SetAndExecuteAsync(db, userId, async () =>
        {
            appt.Status    = status;
            appt.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        });

        return null;
    }

    public async Task<(AppointmentDto? Dto, string? Error)> CreateAsync(
        CreateAppointmentRequest request,
        Guid userId)
    {
        if (!Guid.TryParse(request.PatientId, out var patientId))
            return (null, "invalid_patient_id");
        if (!Guid.TryParse(request.DoctorId, out var doctorId))
            return (null, "invalid_doctor_id");

        var patient = await db.Patients.FindAsync(patientId);
        if (patient is null) return (null, "patient_not_found");

        var doctor = await db.Doctors.FindAsync(doctorId);
        if (doctor is null) return (null, "doctor_not_found");

        var now = DateTimeOffset.UtcNow;
        var appointment = new AppointmentEntity
        {
            Id              = Guid.NewGuid(),
            PatientId       = patientId,
            DoctorId        = doctorId,
            AppointmentDate = DateOnly.Parse(request.Date),
            AppointmentTime = request.Time,
            Type            = request.Type,
            Notes           = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes,
            Status          = "Scheduled",
            CreatedAt       = now,
            UpdatedAt       = now,
        };

        await SessionContextHelper.SetAndExecuteAsync(db, userId, async () =>
        {
            db.Appointments.Add(appointment);
            await db.SaveChangesAsync();
        });

        return (new AppointmentDto
        {
            Id          = appointment.Id.ToString(),
            PatientId   = patientId.ToString(),
            PatientName = patient.FullName,
            DoctorId    = doctorId.ToString(),
            Doctor      = doctor.Name,
            Date        = appointment.AppointmentDate.ToString("yyyy-MM-dd"),
            Time        = appointment.AppointmentTime,
            Type        = appointment.Type,
            Status      = appointment.Status,
            Notes       = appointment.Notes,
        }, null);
    }
}
