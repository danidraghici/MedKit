namespace MedKit.Api.API.DTOs;

public record AuditLogDto(
    string Id,
    string? PerformedByUserId,
    string? PerformedByName,
    string Action,
    string EntityType,
    string? EntityId,
    string? OldValues,
    string? NewValues,
    string? IpAddress,
    string? Metadata,
    DateTimeOffset PerformedAt
);
