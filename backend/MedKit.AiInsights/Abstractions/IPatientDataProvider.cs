using MedKit.AiInsights.Models;

namespace MedKit.AiInsights.Abstractions;

public interface IPatientDataProvider
{
    Task<PatientProfileData> GetPatientProfileAsync(Guid patientId, CancellationToken ct);
    Task<IReadOnlyList<MedicalRecordData>> GetMedicalRecordsAsync(Guid patientId, int limit, CancellationToken ct);
    Task<IReadOnlyList<LabResultSummaryData>> GetLabResultsWithInsightsAsync(Guid patientId, int limit, CancellationToken ct);
    Task<IReadOnlyList<string>> GetActiveMedicationsAsync(Guid patientId, CancellationToken ct);
}
