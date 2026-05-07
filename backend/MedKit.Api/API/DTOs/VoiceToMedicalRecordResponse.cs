namespace MedKit.Api.API.DTOs;

public class VoiceVitalSigns
{
    public string? BloodPressure { get; set; }
    public string? HeartRate { get; set; }
    public string? Temperature { get; set; }
    public string? RespiratoryRate { get; set; }
    public string? OxygenSaturation { get; set; }
    public string? Weight { get; set; }
    public string? Height { get; set; }
}

public class VoicePrescribedDrug
{
    public string? Name { get; set; }
    public string? GenericName { get; set; }
    public string? Dose { get; set; }
    public string? Route { get; set; }
    public string? Frequency { get; set; }
    public string? Duration { get; set; }
    public string? Quantity { get; set; }
    public string? Instructions { get; set; }
    public string? Indication { get; set; }
}

public class VoiceToMedicalRecordResponse
{
    public string? Transcript { get; set; }
    public string? ChiefComplaint { get; set; }
    public string? Diagnosis { get; set; }
    public string? IcdCode { get; set; }
    public string? SecondaryDiagnoses { get; set; }
    public string? Symptoms { get; set; }
    public string? PhysicalExam { get; set; }
    public string? Treatment { get; set; }
    public string? Procedures { get; set; }
    public string? Urgency { get; set; }
    public string? FollowUpIn { get; set; }
    public string? FollowUpType { get; set; }
    public string? Referral { get; set; }
    public string? PatientEducation { get; set; }
    public VoiceVitalSigns? VitalSigns { get; set; }
    public List<VoicePrescribedDrug>? PrescribedDrugs { get; set; }
}
