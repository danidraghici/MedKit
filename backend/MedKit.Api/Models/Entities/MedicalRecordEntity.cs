using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("medical_records")]
public class MedicalRecordEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("patient_id")]
    public Guid PatientId { get; set; }

    [Column("doctor_id")]
    public Guid DoctorId { get; set; }

    [Column("visit_date")]
    public DateOnly VisitDate { get; set; }

    [Column("visit_type")]
    public string VisitType { get; set; } = "";

    [Column("chief_complaint")]
    public string ChiefComplaint { get; set; } = "";

    [Column("diagnosis")]
    public string Diagnosis { get; set; } = "";

    [Column("icd_code")]
    public string? IcdCode { get; set; }

    [Column("secondary_diagnoses")]
    public string? SecondaryDiagnoses { get; set; }

    [Column("symptoms")]
    public string Symptoms { get; set; } = "";

    [Column("physical_exam")]
    public string? PhysicalExam { get; set; }

    [Column("treatment")]
    public string Treatment { get; set; } = "";

    [Column("procedures")]
    public string? Procedures { get; set; }

    [Column("urgency")]
    public string Urgency { get; set; } = "";

    [Column("follow_up_in")]
    public string? FollowUpIn { get; set; }

    [Column("follow_up_type")]
    public string? FollowUpType { get; set; }

    [Column("referral")]
    public string? Referral { get; set; }

    [Column("patient_education")]
    public string? PatientEducation { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    public VitalSignEntity? VitalSign { get; set; }
    public List<PrescribedDrugEntity> PrescribedDrugs { get; set; } = [];
}
