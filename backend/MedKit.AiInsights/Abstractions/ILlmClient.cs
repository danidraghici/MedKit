using MedKit.AiInsights.Models;

namespace MedKit.AiInsights.Abstractions;

public interface ILlmClient
{
    Task<LlmResponse> CompleteAsync(LlmRequest request, CancellationToken ct = default);
}
