namespace MedKit.Api.API.DTOs;

public record PatientDashboardOverviewDto(
    int UpcomingAppointments,
    int RecentRecords,
    int LabResults,
    string? NextAppointmentDate
);
