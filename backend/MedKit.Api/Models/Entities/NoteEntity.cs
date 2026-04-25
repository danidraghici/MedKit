using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("notes")]
public class NoteEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("patient_id")]
    public Guid PatientId { get; set; }

    [Column("author_id")]
    public Guid AuthorId { get; set; }

    [Column("note_date")]
    public DateTimeOffset NoteDate { get; set; }

    [Column("content")]
    public string Content { get; set; } = "";

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}
