using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("lab_results")]
public class LabResultEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("patient_id")]
    public Guid PatientId { get; set; }

    [Column("uploaded_by_user_id")]
    public Guid UploadedByUserId { get; set; }

    [Column("original_file_name")]
    public string OriginalFileName { get; set; } = "";

    [Column("blob_name")]
    public string BlobName { get; set; } = "";

    [Column("content_type")]
    public string ContentType { get; set; } = "";

    [Column("file_size_bytes")]
    public long FileSizeBytes { get; set; }

    [Column("uploaded_at")]
    public DateTimeOffset UploadedAt { get; set; }
}
