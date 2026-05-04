using System.Text.RegularExpressions;

namespace MedKit.AiInsights.Safety;

public static class ForbiddenPatterns
{
    // Explicit diagnosis stated as patient fact — "ești diagnosticat cu X", "ai fost diagnosticat cu Y".
    // NOTE: removed broad patterns that produce false positives on legitimate clinical hedges:
    //   - "aveți/aveti" → caught possessives like "valorile pe care le aveți crescute"
    //   - "suferiți de" → caught "dacă suferiți de simptome, consultați medicul"
    //   - "diagnosticul este" → caught "diagnosticul este de stabilit de medicul curant"
    // Prompt rules already forbid all diagnosis framing; regex guards only the clearest cases.
    private static readonly Regex DiagnosisPattern = new(
        @"\b(ești diagnosticat|esti diagnosticat|ai fost diagnosticat)\s+\w+",
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
