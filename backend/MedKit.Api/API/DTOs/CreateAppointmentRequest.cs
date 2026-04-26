using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class CreateAppointmentRequest
{
    [Required] public string PatientId { get; set; } = "";
    [Required] public string DoctorId { get; set; } = "";

    [Required, RegularExpression(@"^\d{4}-\d{2}-\d{2}$",
        ErrorMessage = "Data trebuie să fie în formatul yyyy-MM-dd.")]
    public string Date { get; set; } = "";

    [Required, RegularExpression(@"^\d{2}:\d{2}$",
        ErrorMessage = "Ora trebuie să fie în formatul HH:mm.")]
    public string Time { get; set; } = "";

    [Required] public string Type { get; set; } = "";
    public string? Notes { get; set; }
}
