using MedKit.AiInsights.Models;

namespace MedKit.AiInsights.Tools;

public static class PatientDataTools
{
    public static IReadOnlyList<LlmToolDefinition> GetDefinitions() =>
    [
        new LlmToolDefinition
        {
            Function = new LlmFunctionDefinition
            {
                Name = "get_patient_profile",
                Description = "Returnează profilul pacientului curent din sesiune: vârstă, sex, alergii cunoscute și medicamentele active.",
                Parameters = new
                {
                    type = "object",
                    properties = new { },
                    required = Array.Empty<string>()
                }
            }
        },
        new LlmToolDefinition
        {
            Function = new LlmFunctionDefinition
            {
                Name = "get_medical_records",
                Description = "Returnează ultimele N consultații ale pacientului curent cu diagnostic, tip vizită și recomandare follow-up.",
                Parameters = new
                {
                    type = "object",
                    properties = new
                    {
                        limit = new { type = "integer", description = "Numărul maxim de consultații de returnat (default 10)" }
                    },
                    required = Array.Empty<string>()
                }
            }
        },
        new LlmToolDefinition
        {
            Function = new LlmFunctionDefinition
            {
                Name = "get_lab_results_with_insights",
                Description = "Returnează ultimele N rezultate de laborator ale pacientului curent împreună cu insight-ul AI generat (dacă există).",
                Parameters = new
                {
                    type = "object",
                    properties = new
                    {
                        limit = new { type = "integer", description = "Numărul maxim de rezultate de returnat (default 5)" }
                    },
                    required = Array.Empty<string>()
                }
            }
        },
        new LlmToolDefinition
        {
            Function = new LlmFunctionDefinition
            {
                Name = "get_active_medications",
                Description = "Returnează lista medicamentelor active ale pacientului curent.",
                Parameters = new
                {
                    type = "object",
                    properties = new { },
                    required = Array.Empty<string>()
                }
            }
        },
    ];
}
