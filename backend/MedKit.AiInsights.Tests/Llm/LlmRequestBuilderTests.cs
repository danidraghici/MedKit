using FluentAssertions;
using MedKit.AiInsights.Llm;
using MedKit.AiInsights.Models;

namespace MedKit.AiInsights.Tests.Llm;

public class LlmRequestBuilderTests
{
    [Fact]
    public void Build_WithSystemAndUser_ProducesCorrectMessageOrder()
    {
        var request = new LlmRequestBuilder("test-model")
            .WithSystemPrompt("You are a helpful assistant.")
            .WithUserMessage("Hello!")
            .WithMaxTokens(500)
            .Build();

        request.Model.Should().Be("test-model");
        request.Messages.Should().HaveCount(2);
        request.Messages[0].Role.Should().Be("system");
        request.Messages[1].Role.Should().Be("user");
        request.MaxTokens.Should().Be(500);
    }

    [Fact]
    public void Build_WithJsonResponseFormat_SetsResponseFormat()
    {
        var request = new LlmRequestBuilder("model")
            .WithUserMessage("test")
            .WithJsonResponseFormat()
            .Build();

        request.ResponseFormat.Should().NotBeNull();
        request.ResponseFormat!.Type.Should().Be("json_object");
    }

    [Fact]
    public void Build_WithoutJsonFormat_ResponseFormatIsNull()
    {
        var request = new LlmRequestBuilder("model")
            .WithUserMessage("test")
            .Build();

        request.ResponseFormat.Should().BeNull();
    }

    [Fact]
    public void Build_DefaultTemperature_IsLow()
    {
        var request = new LlmRequestBuilder("model").Build();
        request.Temperature.Should().BeApproximately(0.1, 0.001);
    }
}
