using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class UpdateUserProfileRequest
{
    [Required, MinLength(2)]
    public string Name { get; set; } = "";

    public string? Phone { get; set; }
    public string? Specialty { get; set; }
    public string? LicenseNumber { get; set; }
    public string? Department { get; set; }
    public string? Hospital { get; set; }
    public string? Location { get; set; }

    [MaxLength(500)]
    public string? Bio { get; set; }

    public string? YearsExperience { get; set; }
    public string? Languages { get; set; }
}
