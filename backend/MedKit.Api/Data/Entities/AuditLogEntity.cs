using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Data.Entities;

[Table("audit_logs")]
public class AuditLogEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("performed_by_user_id")]
    public Guid? PerformedByUserId { get; set; }

    [Column("action")]
    public string Action { get; set; } = "";

    [Column("entity_type")]
    public string EntityType { get; set; } = "";

    [Column("entity_id")]
    public Guid? EntityId { get; set; }

    [Column("old_values")]
    public string? OldValues { get; set; }

    [Column("new_values")]
    public string? NewValues { get; set; }

    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [Column("user_agent")]
    public string? UserAgent { get; set; }

    [Column("metadata")]
    public string? Metadata { get; set; }

    [Column("performed_at")]
    public DateTimeOffset PerformedAt { get; set; }
}
