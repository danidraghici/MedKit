using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MedKit.Api.Services;

public class ConsultationReminderService(AppDbContext db, ILogger<ConsultationReminderService> logger)
{
    public async Task CreateForRecordAsync(MedicalRecordEntity record)
    {
        if (string.IsNullOrWhiteSpace(record.FollowUpIn)) return;

        if (!FollowUpIntervalParser.TryParseInterval(record.FollowUpIn, out var span))
        {
            logger.LogWarning("ConsultationReminderService: cannot parse follow_up_in '{Value}' on record {Id}",
                record.FollowUpIn, record.Id);
            return;
        }

        var today   = DateOnly.FromDateTime(DateTime.UtcNow);
        var dueDate = FollowUpIntervalParser.AddInterval(DateOnly.FromDateTime(record.CreatedAt.UtcDateTime), span);

        if (dueDate < today) return;

        bool exists = await db.ConsultationReminders.AnyAsync(
            r => r.PatientId == record.PatientId
              && r.Type      == "follow-up-due"
              && r.DueDate   == dueDate
              && !r.Dismissed);

        if (exists) return;

        db.ConsultationReminders.Add(new ConsultationReminderEntity
        {
            Id        = Guid.NewGuid(),
            PatientId = record.PatientId,
            Type      = "follow-up-due",
            Title     = "Consultație de urmărire recomandată",
            Message   = $"Medicul dumneavoastră a recomandat o consultație de urmărire în {record.FollowUpIn}. " +
                        $"Data scadentă: {dueDate:dd.MM.yyyy}.",
            DueDate   = dueDate,
            Priority  = "medium",
            Dismissed = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        await db.SaveChangesAsync();
    }

    public async Task UpsertForRecordAsync(MedicalRecordEntity record, string? previousFollowUpIn)
    {
        if (record.FollowUpIn != previousFollowUpIn && previousFollowUpIn is not null)
        {
            // Dismiss stale reminders tied to the old interval
            if (FollowUpIntervalParser.TryParseInterval(previousFollowUpIn, out var oldSpan))
            {
                var oldDue = FollowUpIntervalParser.AddInterval(
                    DateOnly.FromDateTime(record.CreatedAt.UtcDateTime), oldSpan);

                var stale = await db.ConsultationReminders
                    .Where(r => r.PatientId == record.PatientId
                             && r.Type      == "follow-up-due"
                             && r.DueDate   == oldDue
                             && !r.Dismissed)
                    .ToListAsync();

                foreach (var s in stale)
                {
                    s.Dismissed = true;
                    s.UpdatedAt = DateTimeOffset.UtcNow;
                }

                if (stale.Count > 0)
                    await db.SaveChangesAsync();
            }
        }

        await CreateForRecordAsync(record);
    }
}
