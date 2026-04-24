namespace MedKit.Api.API.DTOs;

public class UserProfileDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Role { get; set; } = "";
    public string? Phone { get; set; }
    public string? Specialty { get; set; }
    public string? LicenseNumber { get; set; }
    public string? Department { get; set; }
    public string? Hospital { get; set; }
    public string? Location { get; set; }
    public string? Bio { get; set; }
    public string? YearsExperience { get; set; }
    public string? Languages { get; set; }
    public DateTimeOffset JoinedDate { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
}
