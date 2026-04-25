using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("lab_request_results")]
public class LabRequestResultEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("lab_request_id")]
    public Guid LabRequestId { get; set; }

    [Column("submitted_by_user_id")]
    public Guid SubmittedByUserId { get; set; }

    [Column("observations")]
    public string? Observations { get; set; }

    [Column("lab_result_id")]
    public Guid? LabResultId { get; set; }

    [Column("submitted_at")]
    public DateTimeOffset SubmittedAt { get; set; }
}
