namespace MedKit.AiInsights.Models;

public class AiInsightsOptions
{
    public const string SectionName = "AiInsights";

    public string LlmEndpoint { get; set; } = "";
    public string LlmApiKey { get; set; } = "";
    public string ModelName { get; set; } = "meta-llama/Llama-3.3-70B-Instruct";
    public string AiSystemUserId { get; set; } = "";
    public int MaxTokensPerInsight { get; set; } = 2000;
    public bool EnableAiFeatures { get; set; } = false;
}
