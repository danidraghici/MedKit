using System.Text.RegularExpressions;

namespace MedKit.AiInsights.Safety;

public static class ForbiddenPatterns
{
    // Explicit diagnosis — "aveți diabet", "suferiți de hipertensiune", etc.
    private static readonly Regex DiagnosisPattern = new(
        @"\b(aveți|aveti|suferiți de|suferiti de|diagnosticul este|ești diagnosticat|esti diagnosticat|ai fost diagnosticat)\s+\w+",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Dosing recommendation — "luați 500 mg", "administrați 2 comprimate", etc.
    private static readonly Regex DosingPattern = new(
        @"\b(luați|luati|administrați|administrati|luaţi)\s+\d+\s*(mg|ml|mcg|g|UI|unități|unitati|comprimate|tablete|picături|picaturi)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Contradicting prescribed treatment — "opriți tratamentul cu", "întrerupeți medicamentul", etc.
    private static readonly Regex TreatmentContraPattern = new(
        @"\b(opriți|opriti|întrerupeți|intrerupeti|nu mai luați|nu mai luati|renunțați la|renuntati la)\s+(tratamentul|medicamentul|medicația|medicatia)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static readonly IReadOnlyList<(string Name, Regex Pattern)> All =
    [
        ("diagnosis_explicit",     DiagnosisPattern),
        ("dosing_recommendation",  DosingPattern),
        ("treatment_contradiction", TreatmentContraPattern),
    ];
}
