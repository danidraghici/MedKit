using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("lab_requests")]
public class LabRequestEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("medical_record_id")]
    public Guid MedicalRecordId { get; set; }

    [Column("patient_id")]
    public Guid PatientId { get; set; }

    [Column("requested_by_doctor_id")]
    public Guid RequestedByDoctorId { get; set; }

    [Column("sample_types")]
    public string SampleTypes { get; set; } = "";

    [Column("status")]
    public string Status { get; set; } = "Pending";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("viewed_by_lab_at")]
    public DateTimeOffset? ViewedByLabAt { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }

    public List<LabRequestResultEntity> Results { get; set; } = [];
}
