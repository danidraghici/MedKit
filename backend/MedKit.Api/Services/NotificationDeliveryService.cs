using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class NotificationDeliveryService(AppDbContext db)
{
    // ── Schedule change ──────────────────────────────────────────────────────

    public async Task DeliverScheduleChangeAsync(Guid doctorId, Guid scheduleEntryId)
    {
        // Resolve which user account belongs to this doctor record
        var doctorUser = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.DoctorId == doctorId);

        if (doctorUser is null) return;

        var rules = await db.NotificationRules
            .Where(r => r.IsActive
                     && r.TriggerEvent == "schedule_change"
                     && (r.TargetAudience == "doctors" || r.TargetAudience == "all"))
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var now = DateTimeOffset.UtcNow;
        var notifications = rules.Count > 0
            ? rules.Select(rule => new UserNotificationEntity
              {
                  Id = Guid.NewGuid(),
                  UserId = doctorUser.Id,
                  NotificationRuleId = rule.Id,
                  Title = rule.Title,
                  Body = rule.Description,
                  IsRead = false,
                  RelatedEntityType = "doctor_schedule",
                  RelatedEntityId = scheduleEntryId,
                  CreatedAt = now,
              }).ToList()
            : [new UserNotificationEntity
              {
                  Id = Guid.NewGuid(),
                  UserId = doctorUser.Id,
                  Title = "Modificare de program propusă",
                  Body = "Un administrator a propus o modificare a programului dvs. Vă rugăm să o examinați și să o aprobați sau respingeți.",
                  IsRead = false,
                  RelatedEntityType = "doctor_schedule",
                  RelatedEntityId = scheduleEntryId,
                  CreatedAt = now,
              }];

        db.UserNotifications.AddRange(notifications);
        await db.SaveChangesAsync();
    }

    // ── Appointment events ───────────────────────────────────────────────────

    public async Task DeliverAppointmentAsync(Guid appointmentId, string triggerEvent)
    {
        var appt = await db.Appointments.AsNoTracking().FirstOrDefaultAsync(a => a.Id == appointmentId);
        if (appt is null) return;

        var rules = await db.NotificationRules
            .Where(r => r.IsActive && r.TriggerEvent == triggerEvent)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var now = DateTimeOffset.UtcNow;
        var toAdd = new List<UserNotificationEntity>();

        if (rules.Count == 0)
        {
            // Fallback system notification
            var defaultTitle = triggerEvent == "appointment_created"
                ? "Programare nouă adăugată"
                : "Status programare actualizat";
            var defaultBody = triggerEvent == "appointment_created"
                ? "A fost adăugată o nouă programare."
                : "Statusul unei programări s-a schimbat.";

            // Notify the doctor
            var doctorUser = await db.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.DoctorId == appt.DoctorId);
            if (doctorUser is not null)
                toAdd.Add(BuildNotification(doctorUser.Id, null, defaultTitle, defaultBody, "appointment", appointmentId, now));

            // Notify the patient
            var patientUser = await db.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.PatientId == appt.PatientId);
            if (patientUser is not null)
                toAdd.Add(BuildNotification(patientUser.Id, null, defaultTitle, defaultBody, "appointment", appointmentId, now));
        }
        else
        {
            foreach (var rule in rules)
            {
                if (rule.TargetAudience is "doctors" or "all")
                {
                    var doctorUser = await db.Users.AsNoTracking()
                        .FirstOrDefaultAsync(u => u.DoctorId == appt.DoctorId);
                    if (doctorUser is not null)
                        toAdd.Add(BuildNotification(doctorUser.Id, rule.Id, rule.Title, rule.Description, "appointment", appointmentId, now));
                }

                if (rule.TargetAudience is "patients" or "all")
                {
                    var patientUser = await db.Users.AsNoTracking()
                        .FirstOrDefaultAsync(u => u.PatientId == appt.PatientId);
                    if (patientUser is not null)
                        toAdd.Add(BuildNotification(patientUser.Id, rule.Id, rule.Title, rule.Description, "appointment", appointmentId, now));
                }
            }
        }

        if (toAdd.Count > 0)
        {
            db.UserNotifications.AddRange(toAdd);
            await db.SaveChangesAsync();
        }
    }

    // ── Lab result completed ─────────────────────────────────────────────────

    public async Task DeliverLabResultAsync(Guid labRequestId)
    {
        var request = await db.LabRequests.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == labRequestId);
        if (request is null) return;

        var patientUser = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.PatientId == request.PatientId);
        if (patientUser is null) return;

        var rules = await db.NotificationRules
            .Where(r => r.IsActive
                     && r.TriggerEvent == "lab_result_completed"
                     && (r.TargetAudience == "patients" || r.TargetAudience == "all"))
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var now = DateTimeOffset.UtcNow;
        var notifications = rules.Count > 0
            ? rules.Select(rule => BuildNotification(patientUser.Id, rule.Id, rule.Title, rule.Description, "lab_request", labRequestId, now)).ToList()
            : [BuildNotification(patientUser.Id, null, "Rezultat analize disponibil", "Rezultatele analizelor dvs. sunt gata. Vă rugăm să contactați medicul pentru a le examina.", "lab_request", labRequestId, now)];

        db.UserNotifications.AddRange(notifications);
        await db.SaveChangesAsync();
    }

    // ── General broadcast ────────────────────────────────────────────────────

    public async Task DeliverGeneralAsync(NotificationRuleEntity rule)
    {
        var now = DateTimeOffset.UtcNow;

        IQueryable<UserEntity> query = db.Users.Where(u => u.IsActive);

        query = rule.TargetAudience switch
        {
            "doctors"  => query.Where(u => u.Role == "specialist_doctor" || u.Role == "lab_doctor"),
            "patients" => query.Where(u => u.Role == "patient"),
            "admins"   => query.Where(u => u.Role == "admin"),
            _          => query, // "all" — no filter
        };

        var userIds = await query.Select(u => u.Id).ToListAsync();

        var notifications = userIds.Select(uid => new UserNotificationEntity
        {
            Id = Guid.NewGuid(),
            UserId = uid,
            NotificationRuleId = rule.Id,
            Title = rule.Title,
            Body = rule.Description,
            IsRead = false,
            RelatedEntityType = "system",
            CreatedAt = now,
        }).ToList();

        if (notifications.Count > 0)
        {
            db.UserNotifications.AddRange(notifications);
            await db.SaveChangesAsync();
        }
    }

    // ── DTO mapping ──────────────────────────────────────────────────────────

    public static UserNotificationDto ToDto(UserNotificationEntity e) => new()
    {
        Id = e.Id.ToString(),
        UserId = e.UserId.ToString(),
        NotificationRuleId = e.NotificationRuleId?.ToString(),
        Title = e.Title,
        Body = e.Body,
        IsRead = e.IsRead,
        RelatedEntityType = e.RelatedEntityType,
        RelatedEntityId = e.RelatedEntityId?.ToString(),
        CreatedAt = e.CreatedAt.ToString("o"),
    };

    // ── Private helpers ──────────────────────────────────────────────────────

    private static UserNotificationEntity BuildNotification(
        Guid userId, Guid? ruleId, string title, string? body,
        string entityType, Guid entityId, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        NotificationRuleId = ruleId,
        Title = title,
        Body = body,
        IsRead = false,
        RelatedEntityType = entityType,
        RelatedEntityId = entityId,
        CreatedAt = now,
    };
}
