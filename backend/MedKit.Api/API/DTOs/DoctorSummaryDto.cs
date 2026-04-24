namespace MedKit.Api.API.DTOs;

public record DoctorSummaryDto(
    string Id,
    string Name,
    string Email,
    string Phone,
    string LicenseNumber,
    string Specialty,
    string DepartmentId,
    string Department,
    string DoctorRole);
