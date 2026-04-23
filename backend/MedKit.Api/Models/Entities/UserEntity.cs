using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("users")]
public class UserEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("email")]
    public string Email { get; set; } = "";

    [Column("password_hash")]
    public string PasswordHash { get; set; } = "";

    [Column("name")]
    public string Name { get; set; } = "";

    [Column("role")]
    public string Role { get; set; } = "";

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("doctor_id")]
    public Guid? DoctorId { get; set; }

    [Column("patient_id")]
    public Guid? PatientId { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }

    [Column("must_change_password")]
    public bool MustChangePassword { get; set; } = false;

    public List<RefreshTokenEntity> RefreshTokens { get; set; } = [];
}
