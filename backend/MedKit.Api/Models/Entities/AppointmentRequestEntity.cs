using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("appointment_requests")]
public class AppointmentRequestEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("patient_id")]
    public Guid PatientId { get; set; }

    [Column("requested_date")]
    public DateOnly RequestedDate { get; set; }

    [Column("requested_time")]
    public string RequestedTime { get; set; } = "";

    [Column("type")]
    public string Type { get; set; } = "";

    [Column("reason")]
    public string Reason { get; set; } = "";

    [Column("preferred_doctor_id")]
    public Guid? PreferredDoctorId { get; set; }

    [Column("status")]
    public string Status { get; set; } = "În așteptare";

    [Column("response_note")]
    public string? ResponseNote { get; set; }

    [Column("responded_by_id")]
    public Guid? RespondedById { get; set; }

    [Column("responded_at")]
    public DateTimeOffset? RespondedAt { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }
}