using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class CreateAppointmentRequest
{
    [Required] public string PatientId { get; set; } = "";
    [Required] public string DoctorId { get; set; } = "";

    [Required, RegularExpression(@"^\d{4}-\d{2}-\d{2}$",
        ErrorMessage = "Date must be in yyyy-MM-dd format.")]
    public string Date { get; set; } = "";

    [Required, RegularExpression(@"^\d{2}:\d{2}$",
        ErrorMessage = "Time must be in HH:mm format.")]
    public string Time { get; set; } = "";

    [Required] public string Type { get; set; } = "";
    public string? Notes { get; set; }
}
