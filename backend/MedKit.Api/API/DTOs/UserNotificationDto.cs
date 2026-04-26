namespace MedKit.Api.API.DTOs;

public class UserNotificationDto
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string? NotificationRuleId { get; set; }
    public string Title { get; set; } = "";
    public string? Body { get; set; }
    public bool IsRead { get; set; }
    public string? RelatedEntityType { get; set; }
    public string? RelatedEntityId { get; set; }
    public string CreatedAt { get; set; } = "";
}
