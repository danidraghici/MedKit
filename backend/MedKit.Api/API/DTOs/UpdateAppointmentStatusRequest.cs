using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class UpdateAppointmentStatusRequest
{
    [Required]
    [RegularExpression("^(Completed|Cancelled|Scheduled)$",
        ErrorMessage = "Status must be 'Completed', 'Cancelled', or 'Scheduled'.")]
    public string Status { get; set; } = "";
}
