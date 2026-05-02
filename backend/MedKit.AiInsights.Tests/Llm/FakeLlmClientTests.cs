using FluentAssertions;
using MedKit.AiInsights.Llm;
using MedKit.AiInsights.Tests.Mocks;

namespace MedKit.AiInsights.Tests.Llm;

public class FakeLlmClientTests
{
    [Fact]
    public async Task CompleteAsync_ReturnsConfiguredResponse()
    {
        const string expectedJson = """{"urgency":"Normal"}""";
        var client = new FakeLlmClient(expectedJson);

        var request = new LlmRequestBuilder("model")
            .WithUserMessage("test")
            .Build();

        var response = await client.CompleteAsync(request);

        response.FirstContent.Should().Be(expectedJson);
        client.ReceivedRequests.Should().HaveCount(1);
    }

    [Fact]
    public async Task CompleteAsync_RecordsAllIncomingRequests()
    {
        var client = new FakeLlmClient("{}");
        var builder = new LlmRequestBuilder("model").WithUserMessage("test");

        await client.CompleteAsync(builder.Build());
        await client.CompleteAsync(builder.Build());

        client.ReceivedRequests.Should().HaveCount(2);
    }

    [Fact]
    public async Task CompleteAsync_WhenConfiguredToThrow_Throws()
    {
        var client = FakeLlmClient.ThatThrowsHttp(System.Net.HttpStatusCode.InternalServerError);
        var request = new LlmRequestBuilder("model").WithUserMessage("test").Build();

        Func<Task> act = () => client.CompleteAsync(request);

        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task CompleteAsync_WithFactory_CallsFactoryPerRequest()
    {
        int callCount = 0;
        var client = new FakeLlmClient(_ =>
        {
            callCount++;
            return $"{{\"call\":{callCount}}}";
        });

        var builder = new LlmRequestBuilder("model").WithUserMessage("x");
        var r1 = await client.CompleteAsync(builder.Build());
        var r2 = await client.CompleteAsync(builder.Build());

        r1.FirstContent.Should().Contain("1");
        r2.FirstContent.Should().Contain("2");
    }
}
