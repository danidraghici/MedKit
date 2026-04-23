namespace MedKit.Api.API.DTOs;

public record AppointmentStatsDto(
    int TotalNext30Days,
    int CompletedLast30Days,
    int Today,
    int NextWeek);
