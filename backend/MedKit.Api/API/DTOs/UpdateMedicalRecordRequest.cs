using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class UpdateMedicalRecordRequest
{
    [Required] public string VisitType { get; set; } = "";
    [Required] public string ChiefComplaint { get; set; } = "";
    [Required] public string Diagnosis { get; set; } = "";
    public string? IcdCode { get; set; }
    public string? SecondaryDiagnoses { get; set; }
    [Required] public string Symptoms { get; set; } = "";
    public string? PhysicalExam { get; set; }
    [Required] public string Treatment { get; set; } = "";
    public string? Procedures { get; set; }
    [Required] public string Urgency { get; set; } = "";
    public string? FollowUpIn { get; set; }
    public string? FollowUpType { get; set; }
    public string? Referral { get; set; }
    public string? PatientEducation { get; set; }
    public CreateVitalSignsRequest? VitalSigns { get; set; }
    public List<CreatePrescribedDrugRequest> PrescribedDrugs { get; set; } = [];
}
