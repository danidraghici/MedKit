using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class CreateDoctorRequest
{
    [Required] public string Name { get; set; } = "";
    [Required, EmailAddress] public string Email { get; set; } = "";
    [Required] public string Phone { get; set; } = "";
    [Required] public string Specialty { get; set; } = "";
    [Required] public string Department { get; set; } = "";
    [Required] public string LicenseNumber { get; set; } = "";
    [Required] public string DoctorRole { get; set; } = "";
}
