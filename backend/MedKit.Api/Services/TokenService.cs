using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MedKit.Api.Data;
using MedKit.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace MedKit.Api.Services;

public class TokenService(AppDbContext ctx, IConfiguration config)
{
    private string AccessSecret => config["Jwt:AccessSecret"]
        ?? throw new InvalidOperationException("Jwt:AccessSecret is not configured");

    private string Issuer => config["Jwt:Issuer"] ?? "medkit-api";
    private string Audience => config["Jwt:Audience"] ?? "medkit-frontend";
    private int AccessExpiresMinutes => int.Parse(config["Jwt:AccessExpiresMinutes"] ?? "15");

    public string GenerateAccessToken(Guid userId, string email, string role)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AccessSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: Issuer,
            audience: Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(AccessExpiresMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRawRefreshToken()
        => RandomNumberGenerator.GetHexString(128, lowercase: true);

    public static string HashToken(string raw)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public async Task StoreRefreshTokenAsync(
        Guid userId,
        string rawToken,
        bool remember,
        string ipAddress,
        string userAgent)
    {
        var days = remember
            ? int.Parse(config["Jwt:RefreshExpiresDays"] ?? "7")
            : int.Parse(config["Jwt:RefreshExpiresDaysDefault"] ?? "1");

        ctx.RefreshTokens.Add(new RefreshTokenEntity
        {
            UserId = userId,
            TokenHash = HashToken(rawToken),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(days),
            CreatedAt = DateTimeOffset.UtcNow,
            IpAddress = ipAddress,
            UserAgent = userAgent
        });
        await ctx.SaveChangesAsync();
    }

    public async Task<(string NewRaw, Guid UserId, bool Remember)?> RotateRefreshTokenAsync(
        string rawToken,
        string ipAddress,
        string userAgent)
    {
        var hash = HashToken(rawToken);
        var existing = await ctx.RefreshTokens
            .FirstOrDefaultAsync(rt =>
                rt.TokenHash == hash &&
                rt.RevokedAt == null &&
                rt.ExpiresAt > DateTimeOffset.UtcNow);

        if (existing is null) return null;

        // Determine whether "remember me" was set from the original token's lifetime
        var totalDuration = existing.ExpiresAt - existing.CreatedAt;
        var remember = totalDuration.TotalHours > 25; // > 1 day = remember

        var newRaw = GenerateRawRefreshToken();
        var days = remember
            ? int.Parse(config["Jwt:RefreshExpiresDays"] ?? "7")
            : int.Parse(config["Jwt:RefreshExpiresDaysDefault"] ?? "1");

        existing.RevokedAt = DateTimeOffset.UtcNow;

        ctx.RefreshTokens.Add(new RefreshTokenEntity
        {
            UserId = existing.UserId,
            TokenHash = HashToken(newRaw),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(days),
            CreatedAt = DateTimeOffset.UtcNow,
            IpAddress = ipAddress,
            UserAgent = userAgent
        });

        await ctx.SaveChangesAsync();
        return (newRaw, existing.UserId, remember);
    }

    public async Task RevokeRefreshTokenAsync(string rawToken)
    {
        var hash = HashToken(rawToken);
        var token = await ctx.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.TokenHash == hash && rt.RevokedAt == null);

        if (token is not null)
        {
            token.RevokedAt = DateTimeOffset.UtcNow;
            await ctx.SaveChangesAsync();
        }
    }

    public async Task RevokeAllUserTokensAsync(Guid userId)
    {
        var tokens = await ctx.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToListAsync();

        foreach (var token in tokens)
            token.RevokedAt = DateTimeOffset.UtcNow;

        await ctx.SaveChangesAsync();
    }

    public async Task CleanExpiredTokensAsync()
    {
        var expired = await ctx.RefreshTokens
            .Where(rt => rt.ExpiresAt < DateTimeOffset.UtcNow)
            .ToListAsync();

        ctx.RefreshTokens.RemoveRange(expired);
        await ctx.SaveChangesAsync();
    }
}
