using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class CreateDepartmentRequest
{
    [Required, MinLength(2)]
    public string Name { get; set; } = "";

    public string? Description { get; set; }
}
