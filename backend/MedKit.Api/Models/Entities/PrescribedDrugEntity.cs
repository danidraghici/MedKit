using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("prescribed_drugs")]
public class PrescribedDrugEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("medical_record_id")]
    public Guid MedicalRecordId { get; set; }

    [Column("prescribed_by_doctor_id")]
    public Guid PrescribedByDoctorId { get; set; }

    [Column("name")]
    public string Name { get; set; } = "";

    [Column("generic_name")]
    public string? GenericName { get; set; }

    [Column("dose")]
    public string Dose { get; set; } = "";

    [Column("route")]
    public string Route { get; set; } = "";

    [Column("frequency")]
    public string Frequency { get; set; } = "";

    [Column("duration")]
    public string Duration { get; set; } = "";

    [Column("quantity")]
    public string? Quantity { get; set; }

    [Column("refills")]
    public string? Refills { get; set; }

    [Column("instructions")]
    public string? Instructions { get; set; }

    [Column("indication")]
    public string? Indication { get; set; }

    [Column("start_date")]
    public DateOnly? StartDate { get; set; }

    [Column("end_date")]
    public DateOnly? EndDate { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}
