using Hangfire;
using Hangfire.SqlServer;
using MedKit.AiInsights.Abstractions;
using MedKit.AiInsights.Generators;
using MedKit.AiInsights.Llm;
using MedKit.AiInsights.Models;
using MedKit.AiInsights.PdfProcessing;
using MedKit.AiInsights.Safety;
using MedKit.Api.Models;
using MedKit.AiWorker.Jobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Polly;
using Polly.Extensions.Http;

var builder = Host.CreateApplicationBuilder(args);

// ── Database ─────────────────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("MedKitDb")
    ?? throw new InvalidOperationException("Connection string 'MedKitDb' is missing.");

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(connectionString));

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
    builder.Services.AddScoped<LabInsightGenerator>();
    builder.Services.AddScoped<OutputValidator>();
    builder.Services.AddScoped<LabAnalysisJob>();
}

builder.Services.AddScoped<PendingLabScanner>();
builder.Services.AddScoped<FollowUpReminderJob>();

// ── Hangfire ──────────────────────────────────────────────────────────────────
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(connectionString, new SqlServerStorageOptions
    {
        CommandBatchMaxTimeout       = TimeSpan.FromMinutes(5),
        SlidingInvisibilityTimeout   = TimeSpan.FromMinutes(5),
        QueuePollInterval            = TimeSpan.FromSeconds(15),
        UseRecommendedIsolationLevel = true,
        DisableGlobalLocks           = true,
    }));

builder.Services.AddHangfireServer(opt =>
{
    opt.WorkerCount = 2;
    opt.Queues      = ["default"];
});

var host = builder.Build();

// Register recurring scanner that enqueues pending lab results every minute
using (var scope = host.Services.CreateScope())
{
    var recurringJobs = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    recurringJobs.AddOrUpdate<PendingLabScanner>(
        "scan-pending-lab-results",
        s => s.ScanAsync(),
        Cron.Minutely);

    recurringJobs.AddOrUpdate<FollowUpReminderJob>(
        "follow-up-reminders",
        job => job.ExecuteAsync(CancellationToken.None),
        "0 6 * * *");   // daily at 06:00 UTC
}

host.Run();
