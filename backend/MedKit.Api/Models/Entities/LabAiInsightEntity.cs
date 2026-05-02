using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("lab_ai_insights")]
public class LabAiInsightEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("lab_result_id")]
    public Guid LabResultId { get; set; }

    [Column("patient_id")]
    public Guid PatientId { get; set; }

    [Column("generated_at")]
    public DateTimeOffset GeneratedAt { get; set; }

    // Doctor variant (clinical register)
    [Column("summary")]
    public string Summary { get; set; } = "";

    [Column("findings")]
    public string Findings { get; set; } = "";       // JSON array

    [Column("recommendations")]
    public string Recommendations { get; set; } = ""; // JSON array

    [Column("urgency")]
    public string Urgency { get; set; } = "";

    [Column("disclaimer")]
    public string Disclaimer { get; set; } = "";

    [Column("model_version")]
    public string? ModelVersion { get; set; }

    // Patient variant (simplified language) — added in migration 010
    [Column("summary_patient")]
    public string? SummaryPatient { get; set; }

    [Column("findings_patient")]
    public string? FindingsPatient { get; set; }       // JSON array

    [Column("recommendations_patient")]
    public string? RecommendationsPatient { get; set; } // JSON array

    [Column("prompt_version")]
    public string? PromptVersion { get; set; }

    public LabResultEntity? LabResult { get; set; }
}
