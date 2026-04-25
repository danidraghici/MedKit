using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class LabRequestResultDto
{
    public string Id { get; set; } = "";
    public string LabRequestId { get; set; } = "";
    public string SubmittedByUserId { get; set; } = "";
    public string SubmitterName { get; set; } = "";
    public string? Observations { get; set; }
    public string? LabResultId { get; set; }
    public string? LabResultFileName { get; set; }
    public string SubmittedAt { get; set; } = "";
}

public class LabRequestDto
{
    public string Id { get; set; } = "";
    public string MedicalRecordId { get; set; } = "";
    public string PatientId { get; set; } = "";
    public string PatientName { get; set; } = "";
    public string RequestedByDoctorId { get; set; } = "";
    public string RequestedByDoctorName { get; set; } = "";
    public List<string> SampleTypes { get; set; } = [];
    public string Status { get; set; } = "";
    public string? Notes { get; set; }
    public string? ViewedByLabAt { get; set; }
    public string CreatedAt { get; set; } = "";
    public string UpdatedAt { get; set; } = "";
    public List<LabRequestResultDto> Results { get; set; } = [];
}

public class UpdateLabRequestStatusRequest
{
    [Required] public string Status { get; set; } = "";
}
