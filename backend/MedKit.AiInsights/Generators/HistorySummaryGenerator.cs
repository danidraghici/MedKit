using System.Diagnostics;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using MedKit.AiInsights.Abstractions;
using MedKit.AiInsights.Llm;
using MedKit.AiInsights.Models;
using MedKit.AiInsights.Tools;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MedKit.AiInsights.Generators;

public class HistorySummaryGenerator(
    ILlmClient llm,
    IOptions<AiInsightsOptions> opts,
    ILogger<HistorySummaryGenerator> logger)
{
    private const string PromptVersion = "v1";
    private const int MaxToolIterations = 10;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public async Task<HistorySummaryResult> GenerateAsync(
        Guid patientId,
        IPatientDataProvider dataProvider,
        CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var model = opts.Value.ModelName;
        var systemPrompt = LoadPrompt("HistorySummaryPrompt.v1.txt");
        var tools = PatientDataTools.GetDefinitions().ToList();

        var messages = new List<LlmMessage>
        {
            new("system", systemPrompt),
            new("user", $"Generează sumar medical complet pentru pacientul cu ID: {patientId}"),
        };

        HistorySummaryRaw raw = new();
        int iterations = 0;

        while (iterations < MaxToolIterations)
        {
            iterations++;

            var req = new LlmRequest
            {
                Model = model,
                Messages = messages,
                MaxTokens = opts.Value.MaxTokensPerInsight,
                Tools = tools,
                ToolChoice = "auto",
            };

            var response = await llm.CompleteAsync(req, ct);
            var choice = response.FirstChoice;

            if (choice is null)
                throw new InvalidOperationException("HistorySummaryGenerator: LLM returned no choices.");

            var assistantMessage = choice.Message!;
            messages.Add(assistantMessage);

            if (choice.FinishReason == "tool_calls" && assistantMessage.ToolCalls?.Count > 0)
            {
                logger.LogInformation("HistorySummaryGenerator: iteration {I}, executing {Count} tool call(s)",
                    iterations, assistantMessage.ToolCalls.Count);

                foreach (var toolCall in assistantMessage.ToolCalls)
                {
                    var toolResult = await ExecuteToolAsync(toolCall, patientId, dataProvider, ct);
                    messages.Add(new LlmMessage("tool", toolResult, ToolCallId: toolCall.Id));
                }

                continue;
            }

            // finish_reason == "stop" — parse the JSON response
            var content = assistantMessage.Content
                ?? throw new InvalidOperationException("HistorySummaryGenerator: LLM returned empty content.");

            raw = JsonSerializer.Deserialize<HistorySummaryRaw>(content, JsonOpts)
                ?? throw new InvalidOperationException("HistorySummaryGenerator: failed to deserialize final response.");

            break;
        }

        if (iterations >= MaxToolIterations)
            logger.LogWarning("HistorySummaryGenerator: reached max iterations ({Max})", MaxToolIterations);

        sw.Stop();
        logger.LogInformation("HistorySummaryGenerator: completed in {Ms}ms after {I} iteration(s)",
            sw.ElapsedMilliseconds, iterations);

        return new HistorySummaryResult(
            Doctor: raw.Doctor ?? new InsightVariant(),
            Patient: raw.Patient ?? new InsightVariant(),
            LatencyMs: sw.ElapsedMilliseconds);
    }

    private async Task<string> ExecuteToolAsync(
        LlmToolCall toolCall,
        Guid patientId,
        IPatientDataProvider dp,
        CancellationToken ct)
    {
        var args = ParseArgs(toolCall.Function.Arguments);

        try
        {
            return toolCall.Function.Name switch
            {
                "get_patient_profile" => JsonSerializer.Serialize(
                    await dp.GetPatientProfileAsync(patientId, ct), JsonOpts),

                "get_medical_records" => JsonSerializer.Serialize(
                    await dp.GetMedicalRecordsAsync(patientId, GetLimit(args, 10), ct), JsonOpts),

                "get_lab_results_with_insights" => JsonSerializer.Serialize(
                    await dp.GetLabResultsWithInsightsAsync(patientId, GetLimit(args, 5), ct), JsonOpts),

                "get_active_medications" => JsonSerializer.Serialize(
                    await dp.GetActiveMedicationsAsync(patientId, ct), JsonOpts),

                _ => $"{{\"error\": \"Unknown tool: {toolCall.Function.Name}\"}}"
            };
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Tool {Tool} failed", toolCall.Function.Name);
            return $"{{\"error\": \"{ex.Message}\"}}";
        }
    }

    private static JsonObject ParseArgs(string arguments)
    {
        try { return JsonSerializer.Deserialize<JsonObject>(arguments) ?? new JsonObject(); }
        catch { return new JsonObject(); }
    }

    private static int GetLimit(JsonObject args, int defaultValue)
    {
        if (args.TryGetPropertyValue("limit", out var node) && node is not null)
            return node.GetValue<int>();
        return defaultValue;
    }

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

    private sealed class HistorySummaryRaw
    {
        [System.Text.Json.Serialization.JsonPropertyName("doctor")]
        public InsightVariant? Doctor { get; init; }

        [System.Text.Json.Serialization.JsonPropertyName("patient")]
        public InsightVariant? Patient { get; init; }
    }
}
