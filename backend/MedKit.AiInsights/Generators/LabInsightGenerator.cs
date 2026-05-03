using System.Diagnostics;
using System.Reflection;
using System.Text;
using System.Text.Json;
using MedKit.AiInsights.Abstractions;
using MedKit.AiInsights.Llm;
using MedKit.AiInsights.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MedKit.AiInsights.Generators;

public class LabInsightGenerator(
    ILlmClient llm,
    IOptions<AiInsightsOptions> opts,
    ILogger<LabInsightGenerator> logger)
{
    private const string PromptVersion = "v1";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString,
    };

    public async Task<LabInsightResult> GenerateAsync(
        string pdfText, PatientContext context, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var model = opts.Value.ModelName;

        // LLM call #1 — parse structured lab tests from raw PDF text
        var parsedTests = await ParseLabTestsAsync(pdfText, model, ct);
        logger.LogInformation("LabInsightGenerator: parsed {Count} lab tests from PDF", parsedTests.Count);

        // Rules engine — enrich trend from patient history (future: pull from lab_test_values table)
        EnrichTrendFromHistory(parsedTests, context.PreviousResults);

        // LLM call #2 — generate dual insight (doctor + patient variants in one call)
        var raw = await GenerateDualInsightAsync(pdfText, parsedTests, context, model, ct);

        sw.Stop();
        return new LabInsightResult(raw, parsedTests, PromptVersion, model, sw.ElapsedMilliseconds);
    }

    // ── LLM call #1 ──────────────────────────────────────────────────────────

    private async Task<List<ParsedLabTest>> ParseLabTestsAsync(
        string pdfText, string model, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(pdfText))
        {
            logger.LogInformation("LabInsightGenerator: PDF text is empty, skipping parse call");
            return [];
        }

        var parsePrompt = LoadPrompt("LabParsePrompt.v1.txt");
        var request = new LlmRequestBuilder(model)
            .WithSystemPrompt(parsePrompt)
            .WithUserMessage(pdfText)
            .WithMaxTokens(1500)
            .WithJsonResponseFormat()
            .Build();

        var response = await llm.CompleteAsync(request, ct);
        var json = response.FirstContent ?? "{}";

        try
        {
            var wrapper = JsonSerializer.Deserialize<ParseTestsWrapper>(json, JsonOpts);
            return wrapper?.Tests ?? [];
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "LabInsightGenerator: failed to parse lab tests JSON, proceeding with empty list");
            return [];
        }
    }

    // ── Rules engine ─────────────────────────────────────────────────────────

    private static void EnrichTrendFromHistory(
        List<ParsedLabTest> tests, List<PreviousLabTest> previousResults)
    {
        if (previousResults.Count == 0) return;

        foreach (var test in tests.Where(t => t.Value.HasValue))
        {
            var prev = previousResults
                .Where(p => p.TestName.Equals(test.TestName, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(p => p.TestedAt)
                .FirstOrDefault();

            if (prev is null) continue;

            test.TrendVsPrevious = test.Value!.Value > prev.Value ? "increasing"
                : test.Value.Value < prev.Value ? "decreasing"
                : "stable";
        }
    }

    // ── LLM call #2 ──────────────────────────────────────────────────────────

    private async Task<LabInsightRaw> GenerateDualInsightAsync(
        string pdfText,
        List<ParsedLabTest> parsedTests,
        PatientContext context,
        string model,
        CancellationToken ct)
    {
        var systemPrompt = LoadPrompt("LabInsightPrompt.v1.txt");
        var userMessage = BuildUserMessage(pdfText, parsedTests, context);

        var request = new LlmRequestBuilder(model)
            .WithSystemPrompt(systemPrompt)
            .WithUserMessage(userMessage)
            .WithMaxTokens(opts.Value.MaxTokensPerInsight)
            .WithJsonResponseFormat()
            .Build();

        var response = await llm.CompleteAsync(request, ct);
        var json = response.FirstContent
            ?? throw new InvalidOperationException("LLM returned empty content for insight generation");

        return JsonSerializer.Deserialize<LabInsightRaw>(json, JsonOpts)
            ?? throw new InvalidOperationException("Failed to deserialize LLM insight response");
    }

    private static string BuildUserMessage(
        string pdfText, List<ParsedLabTest> parsedTests, PatientContext context)
    {
        var sb = new StringBuilder();

        sb.AppendLine("## Profil pacient");
        sb.AppendLine($"Vârstă: {context.AgeYears} ani | Sex: {context.Sex}");

        if (!string.IsNullOrWhiteSpace(context.KnownAllergies))
            sb.AppendLine($"Alergii cunoscute: {context.KnownAllergies}");

        if (context.ActiveMedications.Count > 0)
            sb.AppendLine($"Medicamente active: {string.Join(", ", context.ActiveMedications)}");

        sb.AppendLine();
        sb.AppendLine("## Rezultate de laborator curente (parsate)");
        if (parsedTests.Count > 0)
        {
            foreach (var t in parsedTests)
            {
                var outMarker = t.IsOutOfRange ? " ⚠ ÎN AFARA INTERVALULUI" : "";
                sb.AppendLine(
                    $"- {t.TestName}: {t.Value?.ToString("G") ?? "N/A"} {t.Unit} " +
                    $"(ref: {t.ReferenceRange}){outMarker} | trend: {t.TrendVsPrevious}");
            }
        }
        else
        {
            sb.AppendLine("Nu s-au putut extrage teste structurate. Folosește textul brut de mai jos.");
        }

        if (context.PreviousResults.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("## Rezultate anterioare (pentru calcul trend)");
            foreach (var p in context.PreviousResults)
                sb.AppendLine($"- {p.TestName}: {p.Value} {p.Unit} ({p.TestedAt:yyyy-MM-dd})");
        }

        sb.AppendLine();
        sb.AppendLine("## Text brut PDF");
        var truncated = pdfText.Length > 3000 ? pdfText[..3000] + "\n[... trunchiat]" : pdfText;
        sb.AppendLine(string.IsNullOrWhiteSpace(truncated) ? "(text negăsit — PDF posibil scanat)" : truncated);

        return sb.ToString();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string LoadPrompt(string resourceFileName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var fullName = assembly.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith(resourceFileName, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException(
                $"Embedded prompt '{resourceFileName}' not found. Check EmbeddedResource in .csproj.");

        using var stream = assembly.GetManifestResourceStream(fullName)!;
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    private sealed class ParseTestsWrapper
    {
        [System.Text.Json.Serialization.JsonPropertyName("tests")]
        public List<ParsedLabTest> Tests { get; init; } = [];
    }
}
