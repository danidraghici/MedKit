using System.Text.RegularExpressions;

namespace MedKit.Api.API.Helpers;

public static class FollowUpIntervalParser
{
    private static readonly Regex IntervalRegex = new(
        @"^(\d+)\s*(\S+)$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static bool TryParseInterval(string value, out (int Amount, string Unit) result)
    {
        result = default;
        var match = IntervalRegex.Match(value.Trim());
        if (!match.Success) return false;

        var unit = NormalizeUnit(match.Groups[2].Value);
        if (unit is null) return false;

        result = (int.Parse(match.Groups[1].Value), unit);
        return true;
    }

    public static DateOnly AddInterval(DateOnly date, (int Amount, string Unit) span) => span.Unit switch
    {
        "hour"  => date,
        "day"   => date.AddDays(span.Amount),
        "week"  => date.AddDays(span.Amount * 7),
        "month" => date.AddMonths(span.Amount),
        "year"  => date.AddYears(span.Amount),
        _       => date,
    };

    private static string? NormalizeUnit(string raw) => raw.ToLowerInvariant() switch
    {
        "oră" or "ora" or "ore" or "hour" or "hours"                         => "hour",
        "zi" or "zile" or "day" or "days"                                    => "day",
        "săptămână" or "saptamana" or "săptămâni" or "saptamani"
            or "week" or "weeks"                                              => "week",
        "lună" or "luna" or "luni" or "month" or "months"                    => "month",
        "an" or "ani" or "year" or "years"                                   => "year",
        _ => null,
    };
}
