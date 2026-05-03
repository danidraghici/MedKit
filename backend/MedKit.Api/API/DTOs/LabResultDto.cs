namespace MedKit.Api.API.DTOs;

public class LabResultDto
{
    public string Id { get; set; } = "";
    public string PatientId { get; set; } = "";
    public string UploadedByUserId { get; set; } = "";
    public string UploaderName { get; set; } = "";
    public string OriginalFileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long FileSizeBytes { get; set; }
    public string UploadedAt { get; set; } = "";
    public string AiProcessingStatus { get; set; } = "pending";
    public string? AiProcessingError { get; set; }
}

public class LabAiInsightResponseDto
{
    public string Id { get; set; } = "";
    public string LabResultId { get; set; } = "";
    public string PatientId { get; set; } = "";
    public string GeneratedAt { get; set; } = "";
    public string Urgency { get; set; } = "";
    public string Disclaimer { get; set; } = "";
    // Doctor variant (clinical language)
    public string? Summary { get; set; }
    public string[]? Findings { get; set; }
    public string[]? Recommendations { get; set; }
    // Patient variant (plain language)
    public string? SummaryPatient { get; set; }
    public string[]? FindingsPatient { get; set; }
    public string[]? RecommendationsPatient { get; set; }
}

public class LabProcessingStatusDto
{
    public string Status { get; set; } = "";
    public string? Error { get; set; }
}
