using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("vital_signs")]
public class VitalSignEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("medical_record_id")]
    public Guid MedicalRecordId { get; set; }

    [Column("blood_pressure")]
    public string? BloodPressure { get; set; }

    [Column("heart_rate")]
    public string? HeartRate { get; set; }

    [Column("temperature")]
    public string? Temperature { get; set; }

    [Column("respiratory_rate")]
    public string? RespiratoryRate { get; set; }

    [Column("oxygen_saturation")]
    public string? OxygenSaturation { get; set; }

    [Column("weight")]
    public string? Weight { get; set; }

    [Column("height")]
    public string? Height { get; set; }

    [Column("recorded_at")]
    public DateTimeOffset RecordedAt { get; set; }
}
