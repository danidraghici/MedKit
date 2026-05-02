using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("chat_messages")]
public class ChatMessageEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("session_id")]
    public Guid SessionId { get; set; }

    // Values: 'user' | 'assistant'
    [Column("role")]
    public string Role { get; set; } = "";

    [Column("content")]
    public string Content { get; set; } = "";

    [Column("timestamp")]
    public DateTimeOffset Timestamp { get; set; }

    public ChatSessionEntity? Session { get; set; }
}
