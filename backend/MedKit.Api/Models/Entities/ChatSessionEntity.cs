using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("chat_sessions")]
public class ChatSessionEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    // Null when a doctor queries the assistant without a specific patient context
    [Column("patient_id")]
    public Guid? PatientId { get; set; }

    [Column("initiated_by_user_id")]
    public Guid? InitiatedByUserId { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }

    public List<ChatMessageEntity> Messages { get; set; } = [];
}
