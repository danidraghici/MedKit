using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("user_profiles")]
public class UserProfileEntity
{
    [Key, Column("user_id")]
    public Guid UserId { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("specialty")]
    public string? Specialty { get; set; }

    [Column("license_number")]
    public string? LicenseNumber { get; set; }

    [Column("department")]
    public string? Department { get; set; }

    [Column("hospital")]
    public string? Hospital { get; set; }

    [Column("location")]
    public string? Location { get; set; }

    [Column("bio")]
    public string? Bio { get; set; }

    [Column("years_experience")]
    public string? YearsExperience { get; set; }

    [Column("languages")]
    public string? Languages { get; set; }

    [Column("last_login_at")]
    public DateTimeOffset? LastLoginAt { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }

    public UserEntity User { get; set; } = null!;
}
