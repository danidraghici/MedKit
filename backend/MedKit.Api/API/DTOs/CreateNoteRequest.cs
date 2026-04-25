using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class CreateNoteRequest
{
    [Required]
    public string PatientId { get; set; } = "";

    [Required, MinLength(5)]
    public string Content { get; set; } = "";
}
