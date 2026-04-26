using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class CreateNotificationRuleRequest
{
    [Required, MinLength(2), MaxLength(255)]
    public string Title { get; set; } = "";

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Required, RegularExpression("^(patients|doctors|admins|all)$",
        ErrorMessage = "TargetAudience trebuie să fie unul din: patients, doctors, admins, all")]
    public string TargetAudience { get; set; } = "all";

    public bool IsActive { get; set; } = true;

    [Required, RegularExpression("^(general|schedule_change|appointment_created|appointment_updated|lab_result_completed)$",
        ErrorMessage = "TriggerEvent trebuie să fie unul din: general, schedule_change, appointment_created, appointment_updated, lab_result_completed")]
    public string TriggerEvent { get; set; } = "general";
}
