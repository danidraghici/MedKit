using System.Text.Json.Serialization;

namespace MedKit.AiInsights.Models;

public record LlmMessage(
    [property: JsonPropertyName("role")] string Role,
    [property: JsonPropertyName("content")] string? Content,
    [property: JsonPropertyName("tool_calls")] IList<LlmToolCall>? ToolCalls = null,
    [property: JsonPropertyName("tool_call_id")] string? ToolCallId = null,
    [property: JsonPropertyName("name")] string? Name = null
);

public class LlmRequest
{
    [JsonPropertyName("model")]
    public string Model { get; init; } = "";

    [JsonPropertyName("messages")]
    public List<LlmMessage> Messages { get; init; } = [];

    [JsonPropertyName("max_tokens")]
    public int MaxTokens { get; init; } = 2000;

    [JsonPropertyName("temperature")]
    public double Temperature { get; init; } = 0.1;

    [JsonPropertyName("response_format")]
    public LlmResponseFormat? ResponseFormat { get; init; }

    [JsonPropertyName("tools")]
    public List<LlmToolDefinition>? Tools { get; init; }

    [JsonPropertyName("tool_choice")]
    public string? ToolChoice { get; init; }
}

public record LlmResponseFormat(
    [property: JsonPropertyName("type")] string Type
)
{
    public static LlmResponseFormat JsonObject => new("json_object");
}

public class LlmResponse
{
    [JsonPropertyName("choices")]
    public List<LlmChoice> Choices { get; init; } = [];

    [JsonPropertyName("usage")]
    public LlmUsage? Usage { get; init; }

    public string? FirstContent => Choices.FirstOrDefault()?.Message?.Content;
    public LlmChoice? FirstChoice => Choices.FirstOrDefault();
}

public class LlmChoice
{
    [JsonPropertyName("message")]
    public LlmMessage? Message { get; init; }

    [JsonPropertyName("finish_reason")]
    public string? FinishReason { get; init; }
}

public class LlmUsage
{
    [JsonPropertyName("prompt_tokens")]
    public int PromptTokens { get; init; }

    [JsonPropertyName("completion_tokens")]
    public int CompletionTokens { get; init; }

    [JsonPropertyName("total_tokens")]
    public int TotalTokens { get; init; }
}

// Tool calling support (used by ChatAgent in Phase 5)
public class LlmToolDefinition
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = "function";

    [JsonPropertyName("function")]
    public LlmFunctionDefinition Function { get; init; } = new();
}

public class LlmFunctionDefinition
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = "";

    [JsonPropertyName("description")]
    public string Description { get; init; } = "";

    [JsonPropertyName("parameters")]
    public object Parameters { get; init; } = new { type = "object", properties = new { } };
}

public class LlmToolCall
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = "";

    [JsonPropertyName("type")]
    public string Type { get; init; } = "function";

    [JsonPropertyName("function")]
    public LlmToolCallFunction Function { get; init; } = new();
}

public class LlmToolCallFunction
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = "";

    [JsonPropertyName("arguments")]
    public string Arguments { get; init; } = "";
}
