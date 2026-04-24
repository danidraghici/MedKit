namespace MedKit.Api.API.DTOs;

public record DepartmentDto(
    string Id,
    string Name,
    string Description,
    string CreatedAt,
    string UpdatedAt);
