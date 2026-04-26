using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("notification_rules")]
public class NotificationRuleEntity
{
    [Key, Column("id")]         public Guid Id { get; set; }
    [Column("title")]           public string Title { get; set; } = "";
    [Column("description")]     public string? Description { get; set; }
    [Column("target_audience")] public string TargetAudience { get; set; } = "all";
    [Column("is_active")]       public bool IsActive { get; set; } = true;
    [Column("trigger_event")]   public string TriggerEvent { get; set; } = "general";
    [Column("created_by")]      public Guid CreatedBy { get; set; }
    [Column("created_at")]      public DateTimeOffset CreatedAt { get; set; }
    [Column("updated_at")]      public DateTimeOffset UpdatedAt { get; set; }
}
