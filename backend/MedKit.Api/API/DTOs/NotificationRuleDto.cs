namespace MedKit.Api.API.DTOs;

public class NotificationRuleDto
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string TargetAudience { get; set; } = "all";
    public bool IsActive { get; set; }
    public string CreatedById { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
