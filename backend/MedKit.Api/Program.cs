using System.Text;
using MedKit.AiInsights.Abstractions;
using MedKit.AiInsights.Llm;
using MedKit.AiInsights.Models;
using MedKit.AiInsights.PdfProcessing;
using MedKit.Api.Models;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Polly;
using Polly.Extensions.Http;

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
            "{\"error\":\"Prea multe tentative de autentificare. Vă rugăm să încercați din nou în 15 minute.\"}");
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

// ── AI Insights ───────────────────────────────────────────────────────────────
builder.Services.Configure<AiInsightsOptions>(
    builder.Configuration.GetSection(AiInsightsOptions.SectionName));

var aiOpts = builder.Configuration
    .GetSection(AiInsightsOptions.SectionName)
    .Get<AiInsightsOptions>() ?? new AiInsightsOptions();

if (aiOpts.EnableAiFeatures)
{
    static IAsyncPolicy<HttpResponseMessage> RetryPolicy() =>
        HttpPolicyExtensions
            .HandleTransientHttpError()
            .WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)));

    static IAsyncPolicy<HttpResponseMessage> CircuitBreakerPolicy() =>
        HttpPolicyExtensions
            .HandleTransientHttpError()
            .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30));

    builder.Services
        .AddHttpClient<ILlmClient, OpenAiCompatibleLlmClient>()
        .AddPolicyHandler(RetryPolicy())
        .AddPolicyHandler(CircuitBreakerPolicy());

    builder.Services.AddScoped<TesseractOcrFallback>();
    builder.Services.AddScoped<IPdfTextExtractor, PdfPigTextExtractor>();
}

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
builder.Services.AddScoped<AppointmentRequestService>();
builder.Services.AddScoped<UserProfileService>();
builder.Services.AddScoped<NotificationRuleService>();
builder.Services.AddScoped<NoteService>();
builder.Services.AddScoped<LabResultService>();
builder.Services.AddScoped<LabRequestService>();
builder.Services.AddScoped<MedicalRecordService>();
builder.Services.AddScoped<ConsultationReminderService>();
builder.Services.AddScoped<AttachmentService>();
builder.Services.AddScoped<NotificationDeliveryService>();
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
