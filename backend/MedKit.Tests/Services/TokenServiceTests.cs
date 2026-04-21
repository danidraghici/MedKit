using MedKit.Api.Models;
using MedKit.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace MedKit.Tests.Services;

public class TokenServiceTests
{
    private static AppDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static TokenService CreateService(AppDbContext ctx)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:AccessSecret"] = "super-secret-key-that-is-at-least-32-bytes-long!!",
                ["Jwt:Issuer"] = "medkit-api",
                ["Jwt:Audience"] = "medkit-frontend",
                ["Jwt:AccessExpiresMinutes"] = "15",
                ["Jwt:RefreshExpiresDays"] = "7",
                ["Jwt:RefreshExpiresDaysDefault"] = "1",
            })
            .Build();

        return new TokenService(ctx, config);
    }

    [Fact]
    public void GenerateRawRefreshToken_Returns256CharHexString()
    {
        using var ctx = CreateInMemoryContext();
        var svc = CreateService(ctx);

        var token = svc.GenerateRawRefreshToken();

        Assert.Equal(256, token.Length);
        Assert.Matches("^[0-9a-f]+$", token);
    }

    [Fact]
    public void HashToken_IsDeterministic()
    {
        var raw = "some-raw-token";

        var hash1 = TokenService.HashToken(raw);
        var hash2 = TokenService.HashToken(raw);

        Assert.Equal(hash1, hash2);
    }

    [Fact]
    public void GenerateAccessToken_ReturnsNonEmptyJwt()
    {
        using var ctx = CreateInMemoryContext();
        var svc = CreateService(ctx);

        var token = svc.GenerateAccessToken(Guid.NewGuid(), "test@example.com", "admin");

        Assert.False(string.IsNullOrEmpty(token));
        Assert.Equal(3, token.Split('.').Length);
    }
}
