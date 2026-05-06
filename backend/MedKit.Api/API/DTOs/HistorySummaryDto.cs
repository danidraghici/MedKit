namespace MedKit.Api.API.DTOs;

public class HistorySummaryResponseDto
{
    public string GeneratedAt { get; init; } = "";
    public InsightVariantDto Doctor { get; init; } = new();
    public InsightVariantDto? Patient { get; init; }
}

public class InsightVariantDto
{
    public string Summary { get; init; } = "";
    public string[] Findings { get; init; } = [];
    public string[] Recommendations { get; init; } = [];
}
