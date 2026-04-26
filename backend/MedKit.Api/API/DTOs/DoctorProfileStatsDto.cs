namespace MedKit.Api.API.DTOs;

public record DoctorProfileStatsDto(
    int TotalConsultations,
    int TotalPatients,
    int TotalRecords
);
