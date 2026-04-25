namespace MedKit.Api.API.DTOs;

public class NoteDto
{
    public string Id { get; set; } = "";
    public string PatientId { get; set; } = "";
    public string AuthorId { get; set; } = "";
    public string AuthorName { get; set; } = "";
    public string NoteDate { get; set; } = "";
    public string Content { get; set; } = "";
    public string CreatedAt { get; set; } = "";
}
