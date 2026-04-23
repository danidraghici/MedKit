using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("doctors")]
public class DoctorEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = "";

    [Column("specialty")]
    public string Specialty { get; set; } = "";

    [Column("department")]
    public string Department { get; set; } = "";

    [Column("email")]
    public string Email { get; set; } = "";

    [Column("phone")]
    public string Phone { get; set; } = "";

    [Column("license_number")]
    public string LicenseNumber { get; set; } = "";

    [Column("doctor_role")]
    public string DoctorRole { get; set; } = "";
}
