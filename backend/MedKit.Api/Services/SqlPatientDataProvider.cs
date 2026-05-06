using MedKit.AiInsights.Abstractions;
using MedKit.AiInsights.Models;
using MedKit.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class SqlPatientDataProvider(AppDbContext db) : IPatientDataProvider
{
    private static readonly char[] MedicationSeparators = ['\n', ',', ';'];

    public async Task<PatientProfileData> GetPatientProfileAsync(Guid patientId, CancellationToken ct)
    {
        var patient = await db.Patients
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == patientId, ct)
            ?? throw new InvalidOperationException($"Patient {patientId} not found.");

        var age = CalculateAge(patient.DateOfBirth);

        var allergies = string.IsNullOrWhiteSpace(patient.Allergies)
            ? Array.Empty<string>()
            : patient.Allergies.Split(MedicationSeparators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var medications = string.IsNullOrWhiteSpace(patient.CurrentMedications)
            ? Array.Empty<string>()
            : patient.CurrentMedications.Split(MedicationSeparators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return new PatientProfileData(age, patient.Sex, allergies, medications);
    }

    public async Task<IReadOnlyList<MedicalRecordData>> GetMedicalRecordsAsync(
        Guid patientId, int limit, CancellationToken ct)
    {
        var records = await db.MedicalRecords
            .AsNoTracking()
            .Where(r => r.PatientId == patientId)
            .OrderByDescending(r => r.VisitDate)
            .Take(limit)
            .Include(r => r.PrescribedDrugs)
            .ToListAsync(ct);

        return records.Select(r => new MedicalRecordData(
            r.VisitDate,
            r.VisitType,
            r.Diagnosis,
            r.FollowUpIn,
            r.PrescribedDrugs
                .Select(d => $"{d.Name} {d.Dose} {d.Frequency}".Trim())
                .ToArray()
        )).ToList();
    }

    public async Task<IReadOnlyList<LabResultSummaryData>> GetLabResultsWithInsightsAsync(
        Guid patientId, int limit, CancellationToken ct)
    {
        var results = await db.LabResults
            .AsNoTracking()
            .Where(lr => lr.PatientId == patientId)
            .OrderByDescending(lr => lr.UploadedAt)
            .Take(limit)
            .ToListAsync(ct);

        if (results.Count == 0)
            return [];

        var resultIds = results.Select(r => r.Id).ToList();
        var insights = await db.LabAiInsights
            .AsNoTracking()
            .Where(i => resultIds.Contains(i.LabResultId))
            .ToDictionaryAsync(i => i.LabResultId, ct);

        return results.Select(lr =>
        {
            insights.TryGetValue(lr.Id, out var ins);
            return new LabResultSummaryData(
                lr.OriginalFileName,
                lr.UploadedAt,
                ins?.SummaryPatient ?? ins?.Summary,
                ins?.Urgency);
        }).ToList();
    }

    public async Task<IReadOnlyList<string>> GetActiveMedicationsAsync(
        Guid patientId, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var structured = await (
            from d in db.PrescribedDrugs
            join r in db.MedicalRecords on d.MedicalRecordId equals r.Id
            where r.PatientId == patientId
                  && (d.EndDate == null || d.EndDate >= today)
            orderby r.VisitDate descending
            select $"{d.Name} {d.Dose} {d.Frequency}".Trim()
        ).Distinct().ToListAsync(ct);

        if (structured.Count > 0)
            return structured;

        // Fallback: free-text field on the patient record
        var freeText = await db.Patients
            .AsNoTracking()
            .Where(p => p.Id == patientId)
            .Select(p => p.CurrentMedications)
            .FirstOrDefaultAsync(ct);

        if (string.IsNullOrWhiteSpace(freeText))
            return [];

        return freeText.Split(MedicationSeparators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    private static int CalculateAge(DateOnly dateOfBirth)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var age = today.Year - dateOfBirth.Year;
        if (dateOfBirth > today.AddYears(-age)) age--;
        return age;
    }
}
