using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MedKit.AiWorker.Jobs;

public class FollowUpReminderJob(AppDbContext db, ILogger<FollowUpReminderJob> logger)
{
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var records = await db.MedicalRecords
            .Where(r => r.FollowUpIn != null)
            .ToListAsync(ct);

        int created = 0, skipped = 0;

        foreach (var record in records)
        {
            if (!FollowUpIntervalParser.TryParseInterval(record.FollowUpIn!, out var span))
            {
                logger.LogWarning("FollowUpReminderJob: cannot parse follow_up_in '{Value}' on record {Id}",
                    record.FollowUpIn, record.Id);
                skipped++;
                continue;
            }

            var dueDate = FollowUpIntervalParser.AddInterval(
                DateOnly.FromDateTime(record.CreatedAt.UtcDateTime), span);

            if (dueDate < today)
            {
                skipped++;
                continue;
            }

            bool exists = await db.ConsultationReminders.AnyAsync(
                r => r.PatientId == record.PatientId
                  && r.Type      == "follow-up-due"
                  && r.DueDate   == dueDate
                  && !r.Dismissed,
                ct);

            if (exists)
            {
                skipped++;
                continue;
            }

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
            created++;
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("FollowUpReminderJob: {Created} reminders created, {Skipped} records skipped",
            created, skipped);
    }
}
