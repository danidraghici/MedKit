using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("consultation_reminders")]
public class ConsultationReminderEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("patient_id")]
    public Guid PatientId { get; set; }

    // Values: 'follow-up-due', 'annual-checkup', 'lab-result-ready', 'medication-refill', 'specialist-referral'
    [Column("type")]
    public string Type { get; set; } = "";

    [Column("title")]
    public string Title { get; set; } = "";

    [Column("message")]
    public string Message { get; set; } = "";

    [Column("due_date")]
    public DateOnly DueDate { get; set; }

    // Values: 'low', 'medium', 'high'
    [Column("priority")]
    public string Priority { get; set; } = "";

    [Column("dismissed")]
    public bool Dismissed { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }
}
