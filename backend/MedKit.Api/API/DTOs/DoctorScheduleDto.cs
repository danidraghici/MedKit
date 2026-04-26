using System.ComponentModel.DataAnnotations;

namespace MedKit.Api.API.DTOs;

public class DoctorScheduleDto
{
    public string Id { get; set; } = "";
    public string DoctorId { get; set; } = "";
    public string ScheduleType { get; set; } = "";
    public int? DayOfWeek { get; set; }
    public string? SpecificDate { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public bool IsWorkingDay { get; set; }
    public bool IsFullDay { get; set; }
    public string? Reason { get; set; }
    public string Status { get; set; } = "";
    public string? ProposedByUserId { get; set; }
    public string? ProposedByName { get; set; }
    public string? ReplacesScheduleId { get; set; }
    public string CreatedByUserId { get; set; } = "";
    public string CreatedAt { get; set; } = "";
    public string UpdatedAt { get; set; } = "";
}

public class CreateScheduleEntryRequest
{
    [Required]
    public string ScheduleType { get; set; } = "";

    public int? DayOfWeek { get; set; }
    public string? SpecificDate { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public bool IsWorkingDay { get; set; } = true;
    public bool IsFullDay { get; set; } = false;
    public string? Reason { get; set; }
}

public class UpdateScheduleEntryRequest : CreateScheduleEntryRequest { }
