using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class AppointmentRequestDto
{
    public string Id { get; set; } = "";
    public string PatientId { get; set; } = "";
    public string PatientName { get; set; } = "";
    public string RequestedDate { get; set; } = "";
    public string RequestedTime { get; set; } = "";
    public string Type { get; set; } = "";
    public string Reason { get; set; } = "";
    public string? PreferredDoctor { get; set; }
    public string? PreferredDoctorId { get; set; }
    public string Status { get; set; } = "";
    public string CreatedAt { get; set; } = "";
    public string? ResponseNote { get; set; }
}

public class CreatePatientAppointmentRequest
{
    [Required]
    [RegularExpression(@"^\d{4}-\d{2}-\d{2}$",
        ErrorMessage = "Data trebuie să fie în formatul yyyy-MM-dd.")]
    public string RequestedDate { get; set; } = "";

    [Required]
    public string RequestedTime { get; set; } = "";

    [Required]
    public string Type { get; set; } = "";

    [Required]
    public string Reason { get; set; } = "";

    public string? PreferredDoctorId { get; set; }
}