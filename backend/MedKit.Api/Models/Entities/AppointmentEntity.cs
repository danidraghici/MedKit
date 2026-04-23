using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("appointments")]
public class AppointmentEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("patient_id")]
    public Guid PatientId { get; set; }

    [Column("doctor_id")]
    public Guid DoctorId { get; set; }

    [Column("appointment_date")]
    public DateOnly AppointmentDate { get; set; }

    [Column("appointment_time")]
    public string AppointmentTime { get; set; } = "";

    [Column("type")]
    public string Type { get; set; } = "";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("status")]
    public string Status { get; set; } = "";

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }
}
