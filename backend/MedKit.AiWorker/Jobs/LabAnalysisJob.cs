using System.Text.Json;
using MedKit.AiInsights.Abstractions;
using MedKit.AiInsights.Generators;
using MedKit.AiInsights.Models;
using MedKit.AiInsights.Safety;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MedKit.AiWorker.Jobs;

public class LabAnalysisJob(
    AppDbContext db,
    IPdfTextExtractor pdfExtractor,
    LabInsightGenerator generator,
    OutputValidator validator,
    ILogger<LabAnalysisJob> logger,
    IConfiguration config)
{
    private const string Disclaimer =
        "Aceste informații au caracter informativ și nu constituie un diagnostic medical. " +
        "Consultați întotdeauna medicul dumneavoastră pentru interpretarea rezultatelor de laborator.";

    public async Task ExecuteAsync(Guid labResultId, CancellationToken ct = default)
    {
        var labResult = await db.LabResults.FindAsync([labResultId], ct);
        if (labResult is null)
        {
            logger.LogWarning("LabAnalysisJob: lab result {Id} not found, skipping", labResultId);
            return;
        }

        if (labResult.AiProcessingStatus is "completed" or "skipped" or "processing")
        {
            logger.LogInformation("LabAnalysisJob: {Id} already {Status}, skipping",
                labResultId, labResult.AiProcessingStatus);
            return;
        }

        await MarkProcessingAsync(labResult, ct);

        try
        {
            var context = await BuildPatientContextAsync(labResult, ct);
            var pdfText = await ExtractTextAsync(labResult, ct);
            var result = await generator.GenerateAsync(pdfText, context, ct);

            var (isValid, error) = validator.Validate(result.Raw);
            if (!isValid && error!.StartsWith("forbidden_pattern:"))
            {
                logger.LogWarning("LabAnalysisJob: {Id} safety check failed on attempt 1, retrying once", labResultId);
                result = await generator.GenerateAsync(pdfText, context, ct);
                (isValid, error) = validator.Validate(result.Raw);
            }

            if (!isValid)
            {
                logger.LogWarning("LabAnalysisJob: {Id} failed validation — {Error}", labResultId, error);
                await MarkFailedAsync(labResult, $"validation_failed: {error}", ct);
                return;
            }

            logger.LogInformation(
                "LabAnalysisJob: {Id} persisting | urgency='{Urgency}' urgency_len={UrgencyLen}",
                labResultId, result.Raw.Urgency, result.Raw.Urgency.Length);

            await PersistInsightAsync(labResult, result, ct);
            await CreateRemindersIfNeededAsync(labResult, result.Raw.Urgency, ct);
            await MarkCompletedAsync(labResult, ct);

            logger.LogInformation(
                "LabAnalysisJob: {Id} completed | urgency={Urgency} latency={Ms}ms",
                labResultId, result.Raw.Urgency, result.LatencyMs);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "LabAnalysisJob: {Id} failed with exception", labResultId);
            // Clear stale tracked entities so MarkFailedAsync doesn't try to re-insert the failed insight.
            db.ChangeTracker.Clear();
            var entityToFail = await db.LabResults.FindAsync([labResultId], ct);
            if (entityToFail is not null)
                await MarkFailedAsync(entityToFail, ex.Message[..Math.Min(ex.Message.Length, 500)], ct);
        }
    }

    // ── Text extraction ───────────────────────────────────────────────────────

    private async Task<string> ExtractTextAsync(LabResultEntity labResult, CancellationToken ct)
    {
        var filePath = labResult.BlobName;
        if (!Path.IsPathRooted(filePath))
        {
            var basePath = config["FileStorage:BasePath"];
            if (!string.IsNullOrEmpty(basePath))
                filePath = Path.Combine(basePath, filePath);
        }

        if (!File.Exists(filePath))
        {
            logger.LogWarning("LabAnalysisJob: file not found at '{Path}'", filePath);
            return "";
        }

        await using var fs = File.OpenRead(filePath);
        return await pdfExtractor.ExtractTextAsync(fs, ct);
    }

    // ── Patient context ───────────────────────────────────────────────────────

    private async Task<PatientContext> BuildPatientContextAsync(
        LabResultEntity labResult, CancellationToken ct)
    {
        var patient = await db.Patients
            .FirstOrDefaultAsync(p => p.Id == labResult.PatientId, ct);

        var ageYears = patient is not null ? CalculateAge(patient.DateOfBirth) : 0;
        var sex = patient?.Sex ?? "Necunoscut";

        var activeMedications = BuildMedicationList(patient);

        // Previous results: empty for now — trend context requires a structured lab_test_values table.
        // TODO (future migration): store flagged_tests JSON per LabAiInsight and query it here.
        var previousResults = new List<PreviousLabTest>();

        return new PatientContext(ageYears, sex, patient?.Allergies, activeMedications, previousResults);
    }

    private static List<string> BuildMedicationList(PatientEntity? patient)
    {
        if (patient is null) return [];
        if (string.IsNullOrWhiteSpace(patient.CurrentMedications)) return [];

        return patient.CurrentMedications
            .Split(['\n', ',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(m => !string.IsNullOrWhiteSpace(m))
            .ToList();
    }

    // ── Persistence ───────────────────────────────────────────────────────────

    private async Task PersistInsightAsync(
        LabResultEntity labResult, LabInsightResult result, CancellationToken ct)
    {
        var raw = result.Raw;
        var insight = new LabAiInsightEntity
        {
            Id                     = Guid.NewGuid(),
            LabResultId            = labResult.Id,
            PatientId              = labResult.PatientId,
            GeneratedAt            = DateTimeOffset.UtcNow,
            Summary                = raw.Doctor.Summary,
            Findings               = JsonSerializer.Serialize(raw.Doctor.Findings),
            Recommendations        = JsonSerializer.Serialize(raw.Doctor.Recommendations),
            Urgency                = raw.Urgency,
            Disclaimer             = Disclaimer,
            ModelVersion           = result.ModelVersion,
            SummaryPatient         = raw.Patient.Summary,
            FindingsPatient        = JsonSerializer.Serialize(raw.Patient.Findings),
            RecommendationsPatient = JsonSerializer.Serialize(raw.Patient.Recommendations),
            PromptVersion          = result.PromptVersion,
        };

        db.LabAiInsights.Add(insight);
        await db.SaveChangesAsync(ct);
    }

    private async Task CreateRemindersIfNeededAsync(
        LabResultEntity labResult, string urgency, CancellationToken ct)
    {
        if (urgency is not ("Urgent" or "Consult Doctor"))
            return;

        var (title, message, priority, dueDays) = urgency switch
        {
            "Urgent" => (
                "Rezultat de laborator urgent — contactați medicul imediat",
                "Un rezultat de laborator recent a indicat valori critic anormale. " +
                "Vă rugăm să contactați medicul dumneavoastră cât mai curând posibil.",
                "high", 1),
            _ => (
                "Rezultat de laborator — programați o consultație",
                "Rezultatul de laborator recent conține valori în afara intervalului normal. " +
                "Vă recomandăm să discutați cu medicul dumneavoastră.",
                "medium", 7),
        };

        var reminder = new ConsultationReminderEntity
        {
            Id        = Guid.NewGuid(),
            PatientId = labResult.PatientId,
            Type      = "lab-result-ready",
            Title     = title,
            Message   = message,
            DueDate   = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(dueDays)),
            Priority  = priority,
            Dismissed = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.ConsultationReminders.Add(reminder);
        await db.SaveChangesAsync(ct);
    }

    // ── Status transitions ────────────────────────────────────────────────────

    private async Task MarkProcessingAsync(LabResultEntity entity, CancellationToken ct)
    {
        entity.AiProcessingStatus    = "processing";
        entity.AiProcessingStartedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    private async Task MarkCompletedAsync(LabResultEntity entity, CancellationToken ct)
    {
        entity.AiProcessingStatus       = "completed";
        entity.AiProcessingCompletedAt  = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    private async Task MarkFailedAsync(LabResultEntity entity, string error, CancellationToken ct)
    {
        entity.AiProcessingStatus       = "failed";
        entity.AiProcessingError        = error;
        entity.AiProcessingCompletedAt  = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    private static int CalculateAge(DateOnly dateOfBirth)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var age = today.Year - dateOfBirth.Year;
        if (dateOfBirth > today.AddYears(-age)) age--;
        return age;
    }
}
