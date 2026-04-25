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
}
