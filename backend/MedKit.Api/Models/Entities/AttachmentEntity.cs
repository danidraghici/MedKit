using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("attachments")]
public class AttachmentEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("medical_record_id")]
    public Guid MedicalRecordId { get; set; }

    [Column("name")]
    public string Name { get; set; } = "";

    [Column("mime_type")]
    public string MimeType { get; set; } = "";

    // Stores the file path on disk (e.g. Uploads/attachments/{recordId}/{guid}.pdf)
    [Column("url")]
    public string Url { get; set; } = "";

    [Column("size_bytes")]
    public int SizeBytes { get; set; }

    [Column("uploaded_at")]
    public DateTimeOffset UploadedAt { get; set; }
}
