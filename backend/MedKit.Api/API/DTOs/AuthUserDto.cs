namespace MedKit.Api.API.DTOs;

public class AuthUserDto
{
    public string Id { get; set; } = "";
    public string Email { get; set; } = "";
    public string Name { get; set; } = "";
    public string Role { get; set; } = "";
    public string? PatientId { get; set; }
    public string? DoctorId { get; set; }
    public bool MustChangePassword { get; set; }
}

public class LoginResponse
{
    public string AccessToken { get; set; } = "";
    public AuthUserDto User { get; set; } = null!;
}

public class RefreshResponse
{
    public string AccessToken { get; set; } = "";
    public AuthUserDto User { get; set; } = null!;
}
