using FluentAssertions;
using MedKit.AiInsights.Models;
using MedKit.AiInsights.Safety;
using Microsoft.Extensions.Logging.Abstractions;

namespace MedKit.AiInsights.Tests.Safety;

public class OutputValidatorTests
{
    private static OutputValidator BuildValidator() =>
        new(NullLogger<OutputValidator>.Instance);

    private static LabInsightRaw ValidInsight(string urgency = "Normal") => new()
    {
        Urgency = urgency,
        Doctor = new InsightVariant
        {
            Summary = "Valorile hemogramei sunt în limite normale pentru vârsta pacientului.",
            Findings = ["Hemoglobina în intervalul normal.", "Leucocite normale."],
            Recommendations = ["Continuați monitorizarea anuală."],
        },
        Patient = new InsightVariant
        {
            Summary = "Analizele de sânge sunt în regulă și nu arată probleme îngrijorătoare.",
            Findings = ["Globulele roșii sunt în număr normal.", "Celulele albe arată bine."],
            Recommendations = ["Mergeți la controlul anual conform recomandării medicului."],
        },
    };

    [Fact]
    public void Validate_ValidInsight_ReturnsTrue()
    {
        var validator = BuildValidator();
        var (isValid, error) = validator.Validate(ValidInsight());
        isValid.Should().BeTrue();
        error.Should().BeNull();
    }

    [Theory]
    [InlineData("Normal")]
    [InlineData("Monitor")]
    [InlineData("Consult Doctor")]
    [InlineData("Urgent")]
    public void Validate_AllValidUrgencies_Pass(string urgency)
    {
        var validator = BuildValidator();
        var (isValid, _) = validator.Validate(ValidInsight(urgency));
        isValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_InvalidUrgency_ReturnsFalse()
    {
        var validator = BuildValidator();
        var insight = ValidInsight("Critical");
        var (isValid, error) = validator.Validate(insight);
        isValid.Should().BeFalse();
        error.Should().Contain("invalid_urgency");
    }

    [Fact]
    public void Validate_EmptyDoctorSummary_ReturnsFalse()
    {
        var validator = BuildValidator();
        var insight = new LabInsightRaw
        {
            Urgency = "Normal",
            Doctor  = new InsightVariant { Summary = "", Findings = ["finding"], Recommendations = [] },
            Patient = ValidInsight().Patient,
        };
        var (isValid, error) = validator.Validate(insight);
        isValid.Should().BeFalse();
        error.Should().Contain("doctor_summary");
    }

    [Fact]
    public void Validate_EmptyPatientSummary_ReturnsFalse()
    {
        var validator = BuildValidator();
        var insight = new LabInsightRaw
        {
            Urgency = "Normal",
            Doctor  = ValidInsight().Doctor,
            Patient = new InsightVariant { Summary = "", Findings = ["finding"], Recommendations = [] },
        };
        var (isValid, error) = validator.Validate(insight);
        isValid.Should().BeFalse();
        error.Should().Contain("patient_summary");
    }

    [Fact]
    public void Validate_NoFindings_ReturnsFalse()
    {
        var validator = BuildValidator();
        var insight = new LabInsightRaw
        {
            Urgency = "Normal",
            Doctor  = new InsightVariant
            {
                Summary  = "Sumar clinic detaliat cu informații relevante despre analize.",
                Findings = [],
                Recommendations = [],
            },
            Patient = ValidInsight().Patient,
        };
        var (isValid, error) = validator.Validate(insight);
        isValid.Should().BeFalse();
        error.Should().Contain("findings");
    }

    [Fact]
    public void Validate_ForbiddenDiagnosisPattern_ReturnsFalse()
    {
        var validator = BuildValidator();
        var insight = ValidInsight();
        var modified = new LabInsightRaw
        {
            Urgency = insight.Urgency,
            Doctor  = new InsightVariant
            {
                Summary         = "Pacientul aveți diabet de tip 2 confirmat.",
                Findings        = insight.Doctor.Findings,
                Recommendations = insight.Doctor.Recommendations,
            },
            Patient = insight.Patient,
        };
        var (isValid, error) = validator.Validate(modified);
        isValid.Should().BeFalse();
        error.Should().Contain("forbidden_pattern").And.Contain("diagnosis_explicit");
    }

    [Fact]
    public void Validate_ForbiddenDosingPattern_ReturnsFalse()
    {
        var validator = BuildValidator();
        var insight = ValidInsight();
        var modified = new LabInsightRaw
        {
            Urgency = insight.Urgency,
            Doctor  = insight.Doctor,
            Patient = new InsightVariant
            {
                Summary         = insight.Patient.Summary,
                Findings        = insight.Patient.Findings,
                Recommendations = ["Luați 500 mg de Metformin zilnic."],
            },
        };
        var (isValid, error) = validator.Validate(modified);
        isValid.Should().BeFalse();
        error.Should().Contain("forbidden_pattern").And.Contain("dosing_recommendation");
    }

    [Fact]
    public void Validate_ForbiddenTreatmentContradiction_ReturnsFalse()
    {
        var validator = BuildValidator();
        var insight = ValidInsight();
        var modified = new LabInsightRaw
        {
            Urgency = insight.Urgency,
            Doctor  = new InsightVariant
            {
                Summary         = insight.Doctor.Summary,
                Findings        = ["Opriți tratamentul cu Metformin imediat."],
                Recommendations = insight.Doctor.Recommendations,
            },
            Patient = insight.Patient,
        };
        var (isValid, error) = validator.Validate(modified);
        isValid.Should().BeFalse();
        error.Should().Contain("forbidden_pattern").And.Contain("treatment_contradiction");
    }
}
