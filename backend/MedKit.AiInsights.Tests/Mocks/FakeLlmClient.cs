using MedKit.AiInsights.Abstractions;
using MedKit.AiInsights.Models;

namespace MedKit.AiInsights.Tests.Mocks;

/// <summary>
/// In-memory ILlmClient for unit tests. Accepts a fixed response string or a factory
/// function for dynamic responses based on the incoming request.
/// </summary>
public class FakeLlmClient : ILlmClient
{
    private readonly Func<LlmRequest, string> _responseFactory;
    private readonly bool _shouldThrow;
    private readonly Exception? _exception;

    public List<LlmRequest> ReceivedRequests { get; } = [];

    public FakeLlmClient(string jsonResponse)
        : this(_ => jsonResponse) { }

    public FakeLlmClient(Func<LlmRequest, string> responseFactory)
    {
        _responseFactory = responseFactory;
    }

    private FakeLlmClient(Exception exception)
    {
        _responseFactory = _ => "";
        _shouldThrow = true;
        _exception = exception;
    }

    public static FakeLlmClient ThatThrows(Exception ex) => new(ex);

    public static FakeLlmClient ThatThrowsHttp(System.Net.HttpStatusCode status = System.Net.HttpStatusCode.InternalServerError)
        => ThatThrows(new HttpRequestException($"Simulated HTTP {(int)status}", null, status));

    public Task<LlmResponse> CompleteAsync(LlmRequest request, CancellationToken ct = default)
    {
        ReceivedRequests.Add(request);

        if (_shouldThrow)
            throw _exception!;

        var content = _responseFactory(request);
        var response = new LlmResponse
        {
            Choices =
            [
                new LlmChoice
                {
                    Message = new LlmMessage("assistant", content),
                    FinishReason = "stop"
                }
            ],
            Usage = new LlmUsage { PromptTokens = 100, CompletionTokens = 50, TotalTokens = 150 }
        };

        return Task.FromResult(response);
    }
}
