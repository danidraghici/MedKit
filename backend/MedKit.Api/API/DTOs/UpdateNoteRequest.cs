using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class UpdateNoteRequest
{
    [Required, MinLength(5)]
    public string Content { get; set; } = "";
}
