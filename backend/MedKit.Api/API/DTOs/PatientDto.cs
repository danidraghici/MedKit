namespace MedKit.Api.API.DTOs;

public class PatientDto
{
    public string Id { get; set; } = "";
    public string FullName { get; set; } = "";
    public string DateOfBirth { get; set; } = "";
    public string Sex { get; set; } = "";
    public string NationalId { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    public string BloodType { get; set; } = "";
    public string Allergies { get; set; } = "";
    public string CurrentMedications { get; set; } = "";
    public string CreatedAt { get; set; } = "";
    public string UpdatedAt { get; set; } = "";
}
