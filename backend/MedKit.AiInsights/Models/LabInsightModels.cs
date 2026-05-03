using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MedKit.AiInsights.Models;

// Handles LLM responses that return numeric values as JSON strings (e.g. "12.5" instead of 12.5).
internal sealed class FlexibleDoubleConverter : JsonConverter<double>
{
    public override double Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            var s = reader.GetString() ?? "0";
            return double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : 0;
        }
        return reader.GetDouble();
    }

    public override void Write(Utf8JsonWriter writer, double value, JsonSerializerOptions options)
        => writer.WriteNumberValue(value);
}

internal sealed class FlexibleNullableDoubleConverter : JsonConverter<double?>
{
    public override double? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        if (reader.TokenType == JsonTokenType.String)
        {
            var s = reader.GetString();
            if (string.IsNullOrWhiteSpace(s)) return null;
            return double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : null;
        }
        return reader.GetDouble();
    }

    public override void Write(Utf8JsonWriter writer, double? value, JsonSerializerOptions options)
    {
        if (value is null) writer.WriteNullValue();
        else writer.WriteNumberValue(value.Value);
    }
}

// Input context built by LabAnalysisJob and passed to LabInsightGenerator
public record PatientContext(
    int AgeYears,
    string Sex,
    string? KnownAllergies,
    List<string> ActiveMedications,
    List<PreviousLabTest> PreviousResults
);

// Used for trend context — populated from stored historical insights
public record PreviousLabTest(
    string TestName,
    double Value,
    string Unit,
    DateOnly TestedAt
);

// Output of LLM call #1 — structured lab test parsed from PDF text
public class ParsedLabTest
{
    [JsonPropertyName("test_name")]    public string TestName { get; set; } = "";
    [JsonPropertyName("value")]
    [JsonConverter(typeof(FlexibleNullableDoubleConverter))]
    public double? Value { get; set; }
    [JsonPropertyName("unit")]         public string Unit { get; set; } = "";
    [JsonPropertyName("reference_range")] public string ReferenceRange { get; set; } = "";
    [JsonPropertyName("is_out_of_range")] public bool IsOutOfRange { get; set; }
    [JsonPropertyName("deviation")]    public string Deviation { get; set; } = "normal";
    [JsonPropertyName("trend_vs_previous")] public string TrendVsPrevious { get; set; } = "unknown";
}

// Output of LLM call #2 — full dual-render insight
public class LabInsightRaw
{
    [JsonPropertyName("urgency")]      public string Urgency { get; init; } = "";
    [JsonPropertyName("doctor")]       public InsightVariant Doctor { get; init; } = new();
    [JsonPropertyName("patient")]      public InsightVariant Patient { get; init; } = new();
    [JsonPropertyName("flagged_tests")] public List<FlaggedTest> FlaggedTests { get; init; } = [];
}

public class InsightVariant
{
    [JsonPropertyName("summary")]         public string Summary { get; init; } = "";
    [JsonPropertyName("findings")]        public List<string> Findings { get; init; } = [];
    [JsonPropertyName("recommendations")] public List<string> Recommendations { get; init; } = [];
}

public class FlaggedTest
{
    [JsonPropertyName("test_name")]        public string TestName { get; init; } = "";
    [JsonPropertyName("value")]
    [JsonConverter(typeof(FlexibleDoubleConverter))]
    public double Value { get; init; }
    [JsonPropertyName("unit")]             public string Unit { get; init; } = "";
    [JsonPropertyName("reference_range")]  public string ReferenceRange { get; init; } = "";
    [JsonPropertyName("deviation")]        public string Deviation { get; init; } = "";
    [JsonPropertyName("trend_vs_previous")] public string TrendVsPrevious { get; init; } = "";
}

// Returned by LabInsightGenerator to LabAnalysisJob
public record LabInsightResult(
    LabInsightRaw Raw,
    List<ParsedLabTest> ParsedTests,
    string PromptVersion,
    string ModelVersion,
    long LatencyMs
);
