using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService authService, IWebHostEnvironment env) : ControllerBase
{
    private string GetIp()
    {
        var forwarded = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwarded))
            return forwarded.Split(',')[0].Trim();
        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private string GetUserAgent() => Request.Headers.UserAgent.ToString();

    private void SetRefreshCookie(string rawToken, bool remember)
    {
        Response.Cookies.Append("refreshToken", rawToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = env.IsProduction(),
            SameSite = SameSiteMode.Strict,
            MaxAge = remember ? TimeSpan.FromDays(7) : TimeSpan.FromDays(1),
            Path = "/api/auth"
        });
    }

    private void ClearRefreshCookie()
        => Response.Cookies.Delete("refreshToken", new CookieOptions { Path = "/api/auth" });

    // POST /api/auth/login
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (result, error) = await authService.LoginAsync(request, GetIp(), GetUserAgent());

        return error switch
        {
            "account_disabled" => Unauthorized(new { error = "Contul este dezactivat. Contactați administratorul." }),
            "invalid_credentials" => Unauthorized(new { error = "Email sau parolă incorectă." }),
            _ when result is not null => SetCookieAndRespond(result),
            _ => StatusCode(500, new { error = "Eroare neașteptată." })
        };
    }

    private OkObjectResult SetCookieAndRespond(LoginResult result)
    {
        SetRefreshCookie(result.RawRefreshToken, result.Remember);
        return Ok(new { result.AccessToken, result.User });
    }

    // POST /api/auth/refresh
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var rawToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(rawToken))
            return Unauthorized(new { error = "Nu a fost furnizat un token de reîmprospătare." });

        var result = await authService.RefreshAsync(rawToken, GetIp(), GetUserAgent());

        if (result is null)
        {
            ClearRefreshCookie();
            return Unauthorized(new { error = "Token de reîmprospătare invalid sau expirat." });
        }

        SetRefreshCookie(result.NewRawRefreshToken, result.Remember);
        return Ok(new { result.AccessToken, result.User });
    }

    // POST /api/auth/logout
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var rawToken = Request.Cookies["refreshToken"];
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!string.IsNullOrEmpty(rawToken) && Guid.TryParse(userIdClaim, out var userId))
        {
            await authService.LogoutAsync(rawToken, userId, GetIp(), GetUserAgent());
        }

        ClearRefreshCookie();
        return Ok(new { message = "Deconectare efectuată cu succes." });
    }

    // POST /api/auth/change-password
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var error = await authService.ChangePasswordAsync(
            userId, request.CurrentPassword, request.NewPassword);

        return error switch
        {
            "not_found"      => NotFound(new { error = "Utilizatorul nu a fost găsit." }),
            "wrong_password" => BadRequest(new { error = "Parola curentă este incorectă." }),
            "same_password"  => BadRequest(new { error = "Parola nouă trebuie să fie diferită de parola actuală." }),
            null             => ClearAndRespond(),
            _                => StatusCode(500, new { error = "Eroare neașteptată." })
        };
    }

    private OkObjectResult ClearAndRespond()
    {
        ClearRefreshCookie();
        return Ok(new { message = "Parola a fost schimbată cu succes. Vă rugăm să vă autentificați din nou." });
    }

    // GET /api/health
    [HttpGet("/api/health")]
    public IActionResult Health() => Ok(new { status = "ok", ts = DateTimeOffset.UtcNow });
}
