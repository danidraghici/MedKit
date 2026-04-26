using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("user_notifications")]
public class UserNotificationEntity
{
    [Key, Column("id")]                    public Guid Id { get; set; }
    [Column("user_id")]                    public Guid UserId { get; set; }
    [Column("notification_rule_id")]       public Guid? NotificationRuleId { get; set; }
    [Column("title")]                      public string Title { get; set; } = "";
    [Column("body")]                       public string? Body { get; set; }
    [Column("is_read")]                    public bool IsRead { get; set; }
    [Column("related_entity_type")]        public string? RelatedEntityType { get; set; }
    [Column("related_entity_id")]          public Guid? RelatedEntityId { get; set; }
    [Column("created_at")]                 public DateTimeOffset CreatedAt { get; set; }
}
