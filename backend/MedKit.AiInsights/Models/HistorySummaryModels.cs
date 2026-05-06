namespace MedKit.AiInsights.Models;

public record PatientProfileData(
    int Age,
    string Sex,
    string[] Allergies,
    string[] Medications
);

public record MedicalRecordData(
    DateOnly Date,
    string VisitType,
    string Diagnosis,
    string? FollowUpIn,
    string[] PrescribedDrugs
);

public record LabResultSummaryData(
    string FileName,
    DateTimeOffset UploadedAt,
    string? InsightSummary,
    string? Urgency
);

public record HistorySummaryResult(
    InsightVariant Doctor,
    InsightVariant Patient,
    long LatencyMs
);
