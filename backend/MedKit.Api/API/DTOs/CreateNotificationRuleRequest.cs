using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class CreateNotificationRuleRequest
{
    [Required, MinLength(2), MaxLength(255)]
    public string Title { get; set; } = "";

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Required, RegularExpression("^(patients|doctors|admins|all)$",
        ErrorMessage = "TargetAudience must be one of: patients, doctors, admins, all")]
    public string TargetAudience { get; set; } = "all";

    public bool IsActive { get; set; } = true;
}
