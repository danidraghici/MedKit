namespace MedKit.Api.API.DTOs;

public class AttachmentDto
{
    public string Id { get; set; } = "";
    public string MedicalRecordId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public int Size { get; set; }
    public string UploadedAt { get; set; } = "";
}
