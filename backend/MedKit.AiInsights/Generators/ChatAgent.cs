using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using MedKit.AiInsights.Abstractions;
using MedKit.AiInsights.Models;
using MedKit.AiInsights.Tools;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MedKit.AiInsights.Generators;

public class ChatAgent(
    ILlmClient llm,
    IOptions<AiInsightsOptions> opts,
    ILogger<ChatAgent> logger)
{
    private const int MaxToolIterations = 8;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public async Task<string> SendMessageAsync(
        IReadOnlyList<LlmMessage> history,
        Guid patientId,
        IPatientDataProvider dataProvider,
        bool isDoctor = false,
        CancellationToken ct = default)
    {
        var model = opts.Value.ModelName;
        var basePrompt = LoadPrompt("ChatSystemPrompt.v1.txt");
        var systemPrompt = isDoctor
            ? basePrompt
            : basePrompt + "\n\nCONTEXT: Conversezi direct cu pacientul. Adresează-te la persoana a II-a (ex: \"vârsta ta este de X ani\", \"urmezi tratamentul...\"). Dacă pacientul menționează o urgență medicală (durere în piept, dificultăți de respirație), îndrumă-l IMEDIAT la 112 sau urgențe.";
        var tools = PatientDataTools.GetDefinitions().ToList();

        var messages = new List<LlmMessage>
        {
            new("system", systemPrompt),
        };
        messages.AddRange(history);

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
                Temperature = 0.3,
            };

            var response = await llm.CompleteAsync(req, ct);
            var choice = response.FirstChoice;

            if (choice is null)
                throw new InvalidOperationException("ChatAgent: LLM returned no choices.");

            var assistantMessage = choice.Message!;
            messages.Add(assistantMessage);

            if (choice.FinishReason == "tool_calls" && assistantMessage.ToolCalls?.Count > 0)
            {
                logger.LogInformation("ChatAgent: iteration {I}, executing {Count} tool call(s)",
                    iterations, assistantMessage.ToolCalls.Count);

                foreach (var toolCall in assistantMessage.ToolCalls)
                {
                    var toolResult = await ExecuteToolAsync(toolCall, patientId, dataProvider, ct);
                    messages.Add(new LlmMessage("tool", toolResult, ToolCallId: toolCall.Id));
                }

                continue;
            }

            return assistantMessage.Content
                ?? throw new InvalidOperationException("ChatAgent: LLM returned empty content.");
        }

        logger.LogWarning("ChatAgent: reached max iterations ({Max})", MaxToolIterations);
        return "Nu am putut genera un răspuns. Vă rugăm să reformulați întrebarea.";
    }

    private async Task<string> ExecuteToolAsync(
        LlmToolCall toolCall,
        Guid patientId,
        IPatientDataProvider dp,
        CancellationToken ct)
    {
        if (patientId == Guid.Empty)
            return "{\"error\": \"No patient is associated with this session. Patient-specific data is unavailable.\"}";

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
            return JsonSerializer.Serialize(new { error = ex.Message });
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
}
