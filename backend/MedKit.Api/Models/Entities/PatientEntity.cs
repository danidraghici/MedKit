using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("patients")]
public class PatientEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("full_name")]
    public string FullName { get; set; } = "";

    [Column("date_of_birth")]
    public DateOnly DateOfBirth { get; set; }

    [Column("sex")]
    public string Sex { get; set; } = "";

    [Column("national_id")]
    public string NationalId { get; set; } = "";

    [Column("phone")]
    public string Phone { get; set; } = "";

    [Column("email")]
    public string Email { get; set; } = "";

    [Column("blood_type")]
    public string BloodType { get; set; } = "";

    [Column("allergies")]
    public string? Allergies { get; set; }

    [Column("current_medications")]
    public string? CurrentMedications { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }

    [Column("created_by_doctor_id")]
    public Guid? CreatedByDoctorId { get; set; }

    public UserEntity? User { get; set; }
}
