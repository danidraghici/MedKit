using System.Text;
using MedKit.Api.Models;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ── Database ─────────────────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("MedKitDb")
    ?? throw new InvalidOperationException("Connection string 'MedKitDb' is missing.");

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(connectionString));

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:AccessSecret"];
if (string.IsNullOrEmpty(jwtSecret) || Encoding.UTF8.GetByteCount(jwtSecret) < 32)
{
    if (!builder.Environment.IsDevelopment())
        throw new InvalidOperationException("Jwt:AccessSecret is missing or too short (min 32 bytes for HS256).");
    jwtSecret = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(48));
    builder.Configuration["Jwt:AccessSecret"] = jwtSecret;
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "medkit-api",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "medkit-frontend",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

// ── Rate Limiting ─────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(opt =>
{
    opt.AddFixedWindowLimiter("login", window =>
    {
        window.Window = TimeSpan.FromMinutes(15);
        window.PermitLimit = 5;
        window.QueueLimit = 0;
    });
    opt.RejectionStatusCode = 429;
    opt.OnRejected = async (ctx, _) =>
    {
        ctx.HttpContext.Response.ContentType = "application/json";
        await ctx.HttpContext.Response.WriteAsync(
            "{\"error\":\"Too many login attempts. Please try again in 15 minutes.\"}");
    };
});

// ── CORS ──────────────────────────────────────────────────────────────────────
var frontendUrl = builder.Configuration["FrontendUrl"]
    ?? throw new InvalidOperationException("FrontendUrl is missing from configuration.");

builder.Services.AddCors(opt => opt.AddPolicy("frontend", policy =>
    policy
        .WithOrigins(frontendUrl)
        .AllowCredentials()
        .AllowAnyHeader()
        .AllowAnyMethod()));

// ── Application Services ──────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<PatientService>();
builder.Services.AddScoped<DoctorService>();
builder.Services.AddScoped<DepartmentService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<AppointmentService>();
builder.Services.AddScoped<UserProfileService>();
builder.Services.AddScoped<NotificationRuleService>();
builder.Services.AddScoped<NoteService>();
builder.Services.AddScoped<LabResultService>();
builder.Services.AddScoped<LabRequestService>();
builder.Services.AddScoped<MedicalRecordService>();
builder.Services.AddScoped<AttachmentService>();
builder.Services.AddScoped<DoctorScheduleService>();

// ── Build App ─────────────────────────────────────────────────────────────────
var app = builder.Build();

app.UseHttpsRedirection();
app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();

// ── Scheduled token cleanup (runs every 24 hours) ─────────────────────────────
_ = Task.Run(async () =>
{
    using var timer = new PeriodicTimer(TimeSpan.FromHours(24));
    while (await timer.WaitForNextTickAsync())
    {
        try
        {
            using var scope = app.Services.CreateScope();
            var tokenService = scope.ServiceProvider.GetRequiredService<TokenService>();
            await tokenService.CleanExpiredTokensAsync();
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Failed to clean expired refresh tokens");
        }
    }
});

app.Run();
