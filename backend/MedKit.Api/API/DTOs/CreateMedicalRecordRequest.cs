using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class CreateVitalSignsRequest
{
    public string? BloodPressure { get; set; }
    public string? HeartRate { get; set; }
    public string? Temperature { get; set; }
    public string? RespiratoryRate { get; set; }
    public string? OxygenSaturation { get; set; }
    public string? Weight { get; set; }
    public string? Height { get; set; }
}

public class CreatePrescribedDrugRequest
{
    [Required] public string Name { get; set; } = "";
    public string? GenericName { get; set; }
    [Required] public string Dose { get; set; } = "";
    [Required] public string Route { get; set; } = "";
    [Required] public string Frequency { get; set; } = "";
    [Required] public string Duration { get; set; } = "";
    public string? Quantity { get; set; }
    public string? Refills { get; set; }
    public string? Instructions { get; set; }
    public string? Indication { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
}

public class CreateMedicalRecordRequest
{
    [Required] public string PatientId { get; set; } = "";
    [Required] public string Date { get; set; } = "";
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
