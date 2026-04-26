using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = "";

    [Required, MinLength(8, ErrorMessage = "Parola trebuie să aibă cel puțin 8 caractere")]
    [RegularExpression(
        @"^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$",
        ErrorMessage = "Parola trebuie să conțină o literă mare, o literă mică, un număr și un caracter special")]
    public string NewPassword { get; set; } = "";
}
