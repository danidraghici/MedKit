using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class CreatePatientRequest
{
    [Required] public string FullName { get; set; } = "";
    [Required, RegularExpression(@"^\d{4}-\d{2}-\d{2}$")] public string DateOfBirth { get; set; } = "";
    [Required] public string Sex { get; set; } = "";
    [Required, RegularExpression(@"^\d{13}$", ErrorMessage = "CNP-ul trebuie să aibă exact 13 cifre.")]
    public string NationalId { get; set; } = "";
    [Required] public string Phone { get; set; } = "";
    [Required, EmailAddress] public string Email { get; set; } = "";
    [Required] public string BloodType { get; set; } = "";
    public string Allergies { get; set; } = "";
    public string CurrentMedications { get; set; } = "";
}
