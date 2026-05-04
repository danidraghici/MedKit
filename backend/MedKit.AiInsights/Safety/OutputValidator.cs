using MedKit.AiInsights.Models;
using Microsoft.Extensions.Logging;

namespace MedKit.AiInsights.Safety;

public class OutputValidator(ILogger<OutputValidator> logger)
{
    private static readonly HashSet<string> ValidUrgencies =
        ["Normal", "Monitor", "Consult Doctor", "Urgent"];

    private const int MinSummaryLength = 20;
    private const int MaxSummaryLength = 5000;
    private const int MinFindingsCount = 1;

    public (bool IsValid, string? Error) Validate(LabInsightRaw insight)
    {
        if (!ValidUrgencies.Contains(insight.Urgency))
            return (false, $"invalid_urgency: '{insight.Urgency}'");

        if (string.IsNullOrWhiteSpace(insight.Doctor.Summary))
            return (false, "missing_doctor_summary");

        if (string.IsNullOrWhiteSpace(insight.Patient.Summary))
            return (false, "missing_patient_summary");

        if (insight.Doctor.Summary.Length < MinSummaryLength ||
            insight.Doctor.Summary.Length > MaxSummaryLength)
            return (false, $"doctor_summary_length_invalid: {insight.Doctor.Summary.Length}");

        if (insight.Patient.Summary.Length < MinSummaryLength ||
            insight.Patient.Summary.Length > MaxSummaryLength)
            return (false, $"patient_summary_length_invalid: {insight.Patient.Summary.Length}");

        if (insight.Doctor.Findings.Count < MinFindingsCount)
            return (false, "missing_doctor_findings");

        if (insight.Patient.Findings.Count < MinFindingsCount)
            return (false, "missing_patient_findings");

        var allTexts = new[]
        {
            insight.Doctor.Summary,
            insight.Patient.Summary,
            string.Join(" ", insight.Doctor.Findings),
            string.Join(" ", insight.Patient.Findings),
            string.Join(" ", insight.Doctor.Recommendations),
            string.Join(" ", insight.Patient.Recommendations),
        };

        foreach (var (name, pattern) in ForbiddenPatterns.All)
        {
            foreach (var text in allTexts)
            {
                var match = pattern.Match(text);
                if (match.Success)
                {
                    var snippet = text.Length > 150 ? text[..150] + "…" : text;
                    logger.LogWarning(
                        "Safety: forbidden pattern '{Pattern}' matched — value='{Match}' | context: '{Snippet}'",
                        name, match.Value, snippet);
                    return (false, $"forbidden_pattern: {name}");
                }
            }
        }

        return (true, null);
    }
}
