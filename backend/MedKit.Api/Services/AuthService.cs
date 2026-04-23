using MedKit.Api.API.DTOs;
using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using Microsoft.EntityFrameworkCore;
using BC = BCrypt.Net.BCrypt;

namespace MedKit.Api.Services;

public record LoginResult(
    string AccessToken,
    string RawRefreshToken,
    bool Remember,
    AuthUserDto User);

public record RefreshResult(
    string AccessToken,
    string NewRawRefreshToken,
    bool Remember,
    AuthUserDto User);

public class AuthService(AppDbContext ctx, TokenService tokens, AuditService audit)
{
    // Dummy hash used when the user doesn't exist — keeps bcrypt comparison time constant
    // to prevent email enumeration via timing.
    private const string DummyHash =
        "$2b$12$invalidhashforuserthatdoesnotexist000000000000000000000";

    public async Task<(LoginResult? Result, string? Error)> LoginAsync(
        LoginRequest request,
        string ipAddress,
        string userAgent)
    {
        var user = await ctx.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email.ToLowerInvariant());

        var passwordValid = BC.Verify(request.Password, user?.PasswordHash ?? DummyHash);

        if (user is null || !passwordValid)
            return (null, "invalid_credentials");

        if (!user.IsActive)
            return (null, "account_disabled");

        var rawRefresh = tokens.GenerateRawRefreshToken();
        await tokens.StoreRefreshTokenAsync(user.Id, rawRefresh, request.Remember, ipAddress, userAgent);

        var accessToken = tokens.GenerateAccessToken(user.Id, user.Email, user.Role);
        await audit.LogLoginAsync(user.Id, "success", ipAddress, userAgent);

        var result = new LoginResult(
            AccessToken: accessToken,
            RawRefreshToken: rawRefresh,
            Remember: request.Remember,
            User: new AuthUserDto
            {
                Id = user.Id.ToString(),
                Email = user.Email,
                Name = user.Name,
                Role = user.Role,
                PatientId = user.PatientId?.ToString(),
                DoctorId = user.DoctorId?.ToString(),
                MustChangePassword = user.MustChangePassword
            });

        return (result, null);
    }

    public async Task<RefreshResult?> RefreshAsync(
        string rawToken,
        string ipAddress,
        string userAgent)
    {
        var rotated = await tokens.RotateRefreshTokenAsync(rawToken, ipAddress, userAgent);
        if (rotated is null) return null;

        var (newRaw, userId, remember) = rotated.Value;

        var user = await ctx.Users.FindAsync(userId);
        if (user is null || !user.IsActive) return null;

        var accessToken = tokens.GenerateAccessToken(user.Id, user.Email, user.Role);

        return new RefreshResult(
            AccessToken: accessToken,
            NewRawRefreshToken: newRaw,
            Remember: remember,
            User: new AuthUserDto
            {
                Id = user.Id.ToString(),
                Email = user.Email,
                Name = user.Name,
                Role = user.Role,
                PatientId = user.PatientId?.ToString(),
                DoctorId = user.DoctorId?.ToString(),
                MustChangePassword = user.MustChangePassword
            });
    }

    public async Task LogoutAsync(string rawToken, Guid userId, string ipAddress, string userAgent)
    {
        await tokens.RevokeRefreshTokenAsync(rawToken);
        await audit.LogLogoutAsync(userId, ipAddress, userAgent);
    }

    public async Task<string?> ChangePasswordAsync(
        Guid userId,
        string currentPassword,
        string newPassword)
    {
        var user = await ctx.Users.FindAsync(userId);
        if (user is null) return "not_found";

        if (!BC.Verify(currentPassword, user.PasswordHash))
            return "wrong_password";

        if (BC.Verify(newPassword, user.PasswordHash))
            return "same_password";

        var newHash = BC.HashPassword(newPassword, workFactor: 12);

        await SessionContextHelper.SetAndExecuteAsync(ctx, userId, async () =>
        {
            user.PasswordHash = newHash;
            user.MustChangePassword = false;
            user.UpdatedAt = DateTimeOffset.UtcNow;
            await ctx.SaveChangesAsync();
        });

        // Revoke all refresh tokens — forces re-login on all devices after password change
        await tokens.RevokeAllUserTokensAsync(userId);

        return null;
    }
}
