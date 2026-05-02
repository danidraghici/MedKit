using MedKit.AiInsights.Models;

namespace MedKit.AiInsights.Llm;

public class LlmRequestBuilder
{
    private readonly string _model;
    private readonly List<LlmMessage> _messages = [];
    private int _maxTokens = 2000;
    private double _temperature = 0.1;
    private LlmResponseFormat? _responseFormat;
    private List<LlmToolDefinition>? _tools;
    private string? _toolChoice;

    public LlmRequestBuilder(string model)
    {
        _model = model;
    }

    public LlmRequestBuilder WithSystemPrompt(string content)
    {
        _messages.Add(new LlmMessage("system", content));
        return this;
    }

    public LlmRequestBuilder WithUserMessage(string content)
    {
        _messages.Add(new LlmMessage("user", content));
        return this;
    }

    public LlmRequestBuilder WithAssistantMessage(string content)
    {
        _messages.Add(new LlmMessage("assistant", content));
        return this;
    }

    public LlmRequestBuilder WithMaxTokens(int maxTokens)
    {
        _maxTokens = maxTokens;
        return this;
    }

    public LlmRequestBuilder WithTemperature(double temperature)
    {
        _temperature = temperature;
        return this;
    }

    public LlmRequestBuilder WithJsonResponseFormat()
    {
        _responseFormat = LlmResponseFormat.JsonObject;
        return this;
    }

    public LlmRequestBuilder WithTools(List<LlmToolDefinition> tools, string toolChoice = "auto")
    {
        _tools = tools;
        _toolChoice = toolChoice;
        return this;
    }

    public LlmRequest Build() => new()
    {
        Model = _model,
        Messages = [.. _messages],
        MaxTokens = _maxTokens,
        Temperature = _temperature,
        ResponseFormat = _responseFormat,
        Tools = _tools,
        ToolChoice = _toolChoice
    };
}
