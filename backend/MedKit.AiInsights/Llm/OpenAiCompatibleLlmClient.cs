using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using MedKit.AiInsights.Abstractions;
using MedKit.AiInsights.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MedKit.AiInsights.Llm;

public class OpenAiCompatibleLlmClient : ILlmClient
{
    private readonly HttpClient _http;
    private readonly AiInsightsOptions _opts;
    private readonly ILogger<OpenAiCompatibleLlmClient> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public OpenAiCompatibleLlmClient(
        HttpClient http,
        IOptions<AiInsightsOptions> opts,
        ILogger<OpenAiCompatibleLlmClient> logger)
    {
        _http = http;
        _opts = opts.Value;
        _logger = logger;

        _http.BaseAddress = new Uri(_opts.LlmEndpoint.TrimEnd('/') + "/");
        _http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _opts.LlmApiKey);
        _http.Timeout = TimeSpan.FromSeconds(120);
    }

    public async Task<LlmResponse> CompleteAsync(LlmRequest request, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var body = JsonSerializer.Serialize(request, JsonOpts);
        using var content = new StringContent(body, Encoding.UTF8, "application/json");

        _logger.LogDebug("LLM request → model={Model} messages={Count}", request.Model, request.Messages.Count);

        using var response = await _http.PostAsync("chat/completions", content, ct);

        sw.Stop();
        _logger.LogDebug("LLM response ← status={Status} latency={Ms}ms", (int)response.StatusCode, sw.ElapsedMilliseconds);

        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(ct);
        var result = JsonSerializer.Deserialize<LlmResponse>(json, JsonOpts)
            ?? throw new InvalidOperationException("LLM returned an empty or unparseable response.");

        _logger.LogInformation("LLM completed: tokens={Total} latency={Ms}ms",
            result.Usage?.TotalTokens ?? 0, sw.ElapsedMilliseconds);

        return result;
    }
}
