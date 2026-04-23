namespace MedKit.Api.API.DTOs;

public class AppointmentDto
{
    public string Id { get; set; } = "";
    public string PatientId { get; set; } = "";
    public string PatientName { get; set; } = "";
    public string DoctorId { get; set; } = "";
    public string Doctor { get; set; } = "";
    public string Date { get; set; } = "";
    public string Time { get; set; } = "";
    public string Type { get; set; } = "";
    public string Status { get; set; } = "";
    public string? Notes { get; set; }
}
