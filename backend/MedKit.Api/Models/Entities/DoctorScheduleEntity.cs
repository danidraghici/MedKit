using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("doctor_schedules")]
public class DoctorScheduleEntity
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("doctor_id")]
    public Guid DoctorId { get; set; }

    [Column("schedule_type")]
    public string ScheduleType { get; set; } = "";

    [Column("day_of_week")]
    public int? DayOfWeek { get; set; }

    [Column("specific_date")]
    public DateOnly? SpecificDate { get; set; }

    [Column("start_time")]
    public string? StartTime { get; set; }

    [Column("end_time")]
    public string? EndTime { get; set; }

    [Column("is_working_day")]
    public bool IsWorkingDay { get; set; } = true;

    [Column("is_full_day")]
    public bool IsFullDay { get; set; } = false;

    [Column("reason")]
    public string? Reason { get; set; }

    [Column("status")]
    public string Status { get; set; } = "active";

    [Column("proposed_by_user_id")]
    public Guid? ProposedByUserId { get; set; }

    [Column("replaces_schedule_id")]
    public Guid? ReplacesScheduleId { get; set; }

    [Column("created_by_user_id")]
    public Guid CreatedByUserId { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }

    public DoctorEntity? Doctor { get; set; }
}
