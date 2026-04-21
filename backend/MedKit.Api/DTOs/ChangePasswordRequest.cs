using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.DTOs;

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = "";

    [Required, MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
    [RegularExpression(
        @"^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$",
        ErrorMessage = "Password must contain an uppercase letter, lowercase letter, number, and special character")]
    public string NewPassword { get; set; } = "";
}
