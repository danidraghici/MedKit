using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class DoctorScheduleService(AppDbContext db, NotificationDeliveryService notificationService)
{
    private static readonly System.Text.RegularExpressions.Regex TimeRegex =
        new(@"^\d{2}:\d{2}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    // ── Read ────────────────────────────────────────────────────────────────

    public async Task<List<DoctorScheduleDto>> GetActiveAsync(Guid doctorId)
    {
        var entries = await db.DoctorSchedules
            .Where(s => s.DoctorId == doctorId && s.Status == "active")
            .OrderBy(s => s.ScheduleType)
            .ThenBy(s => s.DayOfWeek)
            .ThenBy(s => s.SpecificDate)
            .ToListAsync();

        var proposerIds = entries
            .Where(s => s.ProposedByUserId.HasValue)
            .Select(s => s.ProposedByUserId!.Value)
            .Distinct()
            .ToList();

        var proposerNames = proposerIds.Count > 0
            ? await db.Users
                .Where(u => proposerIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Name)
            : new Dictionary<Guid, string>();

        return entries.Select(s => ToDto(s, s.ProposedByUserId.HasValue && proposerNames.TryGetValue(s.ProposedByUserId.Value, out var n) ? n : null)).ToList();
    }

    public async Task<List<DoctorScheduleDto>> GetPendingForDoctorAsync(Guid doctorId)
    {
        var entries = await db.DoctorSchedules
            .Where(s => s.DoctorId == doctorId && s.Status == "pending_approval")
            .OrderBy(s => s.CreatedAt)
            .ToListAsync();

        var proposerIds = entries
            .Where(s => s.ProposedByUserId.HasValue)
            .Select(s => s.ProposedByUserId!.Value)
            .Distinct()
            .ToList();

        var proposerNames = proposerIds.Count > 0
            ? await db.Users
                .Where(u => proposerIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Name)
            : new Dictionary<Guid, string>();

        return entries.Select(s => ToDto(s, s.ProposedByUserId.HasValue && proposerNames.TryGetValue(s.ProposedByUserId.Value, out var n) ? n : null)).ToList();
    }

    public async Task<int> GetPendingCountAsync(Guid doctorId) =>
        await db.DoctorSchedules.CountAsync(s => s.DoctorId == doctorId && s.Status == "pending_approval");

    public async Task<List<string>> GetAvailableSlotsAsync(Guid doctorId, DateOnly date)
    {
        int dayOfWeek = (int)date.DayOfWeek;

        var workingHours = await db.DoctorSchedules
            .Where(s => s.DoctorId == doctorId
                     && s.Status == "active"
                     && s.ScheduleType == "working_hours"
                     && s.DayOfWeek == dayOfWeek)
            .FirstOrDefaultAsync();

        string startStr, endStr;
        if (workingHours == null)
        {
            startStr = "08:00";
            endStr = "17:00";
        }
        else if (!workingHours.IsWorkingDay)
        {
            return [];
        }
        else
        {
            startStr = workingHours.StartTime ?? "08:00";
            endStr = workingHours.EndTime ?? "17:00";
        }

        var slots = GenerateSlots(startStr, endStr);

        var hasFullDayBlock = await db.DoctorSchedules
            .AnyAsync(s => s.DoctorId == doctorId
                        && s.Status == "active"
                        && s.ScheduleType == "block"
                        && s.SpecificDate == date
                        && s.IsFullDay);

        if (hasFullDayBlock) return [];

        var timeBlocks = await db.DoctorSchedules
            .Where(s => s.DoctorId == doctorId
                     && s.Status == "active"
                     && s.ScheduleType == "block"
                     && s.SpecificDate == date
                     && !s.IsFullDay
                     && s.StartTime != null
                     && s.EndTime != null)
            .Select(s => new { s.StartTime, s.EndTime })
            .ToListAsync();

        var bookedTimes = await db.Appointments
            .Where(a => a.DoctorId == doctorId
                     && a.AppointmentDate == date
                     && a.Status == "Scheduled")
            .Select(a => a.AppointmentTime)
            .ToListAsync();

        return slots
            .Where(slot => !bookedTimes.Contains(slot))
            .Where(slot => !timeBlocks.Any(b =>
            {
                var slotTime = ParseTimeSpan(slot);
                var blockStart = ParseTimeSpan(b.StartTime!);
                var blockEnd = ParseTimeSpan(b.EndTime!);
                return slotTime >= blockStart && slotTime < blockEnd;
            }))
            .ToList();
    }

    private static List<string> GenerateSlots(string start, string end)
    {
        var slots = new List<string>();
        var current = ParseTimeSpan(start);
        var endTime = ParseTimeSpan(end);
        while (current < endTime)
        {
            slots.Add($"{current.Hours:D2}:{current.Minutes:D2}");
            current = current.Add(TimeSpan.FromMinutes(30));
        }
        return slots;
    }

    private static TimeSpan ParseTimeSpan(string t) => TimeSpan.Parse(t);

    // ── Create ──────────────────────────────────────────────────────────────

    public async Task<(DoctorScheduleDto? Dto, string? Error)> CreateAsync(
        Guid doctorId,
        CreateScheduleEntryRequest req,
        Guid actingUserId,
        string actingUserRole)
    {
        var validationError = Validate(req);
        if (validationError != null) return (null, validationError);

        var isAdmin = actingUserRole == "admin";
        var now = DateTimeOffset.UtcNow;

        var entry = new DoctorScheduleEntity
        {
            Id = Guid.NewGuid(),
            DoctorId = doctorId,
            ScheduleType = req.ScheduleType,
            DayOfWeek = req.DayOfWeek,
            SpecificDate = ParseDate(req.SpecificDate),
            StartTime = req.StartTime,
            EndTime = req.EndTime,
            IsWorkingDay = req.IsWorkingDay,
            IsFullDay = req.IsFullDay,
            Reason = req.Reason,
            Status = isAdmin ? "pending_approval" : "active",
            ProposedByUserId = isAdmin ? actingUserId : null,
            ReplacesScheduleId = null,
            CreatedByUserId = actingUserId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.DoctorSchedules.Add(entry);
        await db.SaveChangesAsync();

        string? proposerName = null;
        if (isAdmin)
        {
            var proposer = await db.Users.FindAsync(actingUserId);
            proposerName = proposer?.Name;
            await notificationService.DeliverScheduleChangeAsync(doctorId, entry.Id);
        }

        return (ToDto(entry, proposerName), null);
    }

    // ── Update ──────────────────────────────────────────────────────────────

    public async Task<(DoctorScheduleDto? Dto, string? Error)> UpdateAsync(
        Guid entryId,
        Guid doctorId,
        UpdateScheduleEntryRequest req,
        Guid actingUserId,
        string actingUserRole)
    {
        var validationError = Validate(req);
        if (validationError != null) return (null, validationError);

        var existing = await db.DoctorSchedules.FindAsync(entryId);
        if (existing == null || existing.DoctorId != doctorId) return (null, "not_found");
        if (existing.Status == "pending_approval" && existing.ProposedByUserId != actingUserId && actingUserRole != "admin")
            return (null, "forbidden");

        var isAdmin = actingUserRole == "admin";
        var now = DateTimeOffset.UtcNow;

        if (!isAdmin)
        {
            // Doctor edits in-place
            existing.ScheduleType = req.ScheduleType;
            existing.DayOfWeek = req.DayOfWeek;
            existing.SpecificDate = ParseDate(req.SpecificDate);
            existing.StartTime = req.StartTime;
            existing.EndTime = req.EndTime;
            existing.IsWorkingDay = req.IsWorkingDay;
            existing.IsFullDay = req.IsFullDay;
            existing.Reason = req.Reason;
            existing.UpdatedAt = now;
            await db.SaveChangesAsync();
            return (ToDto(existing, null), null);
        }
        else
        {
            // Admin: insert a new pending row that references the existing active row
            var pending = new DoctorScheduleEntity
            {
                Id = Guid.NewGuid(),
                DoctorId = doctorId,
                ScheduleType = req.ScheduleType,
                DayOfWeek = req.DayOfWeek,
                SpecificDate = ParseDate(req.SpecificDate),
                StartTime = req.StartTime,
                EndTime = req.EndTime,
                IsWorkingDay = req.IsWorkingDay,
                IsFullDay = req.IsFullDay,
                Reason = req.Reason,
                Status = "pending_approval",
                ProposedByUserId = actingUserId,
                ReplacesScheduleId = entryId,
                CreatedByUserId = actingUserId,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.DoctorSchedules.Add(pending);
            await db.SaveChangesAsync();

            await notificationService.DeliverScheduleChangeAsync(doctorId, pending.Id);

            var proposer = await db.Users.FindAsync(actingUserId);
            return (ToDto(pending, proposer?.Name), null);
        }
    }

    // ── Delete ──────────────────────────────────────────────────────────────

    public async Task<string?> DeleteAsync(Guid entryId, Guid doctorId, string actingUserRole)
    {
        var entry = await db.DoctorSchedules.FindAsync(entryId);
        if (entry == null || entry.DoctorId != doctorId) return "not_found";

        if (actingUserRole == "admin") return "forbidden";

        db.DoctorSchedules.Remove(entry);
        await db.SaveChangesAsync();
        return null;
    }

    // ── Approve ─────────────────────────────────────────────────────────────

    public async Task<(DoctorScheduleDto? Dto, string? Error)> ApproveAsync(
        Guid pendingEntryId,
        Guid doctorId,
        Guid actingUserId)
    {
        var pending = await db.DoctorSchedules.FindAsync(pendingEntryId);
        if (pending == null || pending.DoctorId != doctorId) return (null, "not_found");
        if (pending.Status != "pending_approval") return (null, "not_pending");

        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var replacedId = pending.ReplacesScheduleId;

            pending.Status = "active";
            pending.ProposedByUserId = null;
            pending.UpdatedAt = DateTimeOffset.UtcNow;

            if (replacedId.HasValue)
            {
                var replaced = await db.DoctorSchedules.FindAsync(replacedId.Value);
                if (replaced != null) db.DoctorSchedules.Remove(replaced);
            }

            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        return (ToDto(pending, null), null);
    }

    // ── Reject ──────────────────────────────────────────────────────────────

    public async Task<string?> RejectAsync(Guid pendingEntryId, Guid doctorId)
    {
        var pending = await db.DoctorSchedules.FindAsync(pendingEntryId);
        if (pending == null || pending.DoctorId != doctorId) return "not_found";
        if (pending.Status != "pending_approval") return "not_pending";

        db.DoctorSchedules.Remove(pending);
        await db.SaveChangesAsync();
        return null;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private static string? Validate(CreateScheduleEntryRequest req)
    {
        if (req.ScheduleType != "working_hours" && req.ScheduleType != "block")
            return "invalid_type";

        if (req.ScheduleType == "working_hours")
        {
            if (!req.DayOfWeek.HasValue || req.DayOfWeek < 0 || req.DayOfWeek > 6)
                return "invalid_day";

            if (req.IsWorkingDay && string.IsNullOrWhiteSpace(req.StartTime))
                return "start_time_required";
        }

        if (req.ScheduleType == "block" && string.IsNullOrWhiteSpace(req.SpecificDate))
            return "invalid_date_format";

        if (!string.IsNullOrWhiteSpace(req.StartTime) && !TimeRegex.IsMatch(req.StartTime))
            return "invalid_time_format";

        if (!string.IsNullOrWhiteSpace(req.EndTime) && !TimeRegex.IsMatch(req.EndTime))
            return "invalid_time_format";

        if (!string.IsNullOrWhiteSpace(req.SpecificDate) && !DateOnly.TryParse(req.SpecificDate, out _))
            return "invalid_date_format";

        return null;
    }

    private static DateOnly? ParseDate(string? dateStr) =>
        DateOnly.TryParse(dateStr, out var d) ? d : null;

    private static DoctorScheduleDto ToDto(DoctorScheduleEntity e, string? proposedByName) =>
        new()
        {
            Id = e.Id.ToString(),
            DoctorId = e.DoctorId.ToString(),
            ScheduleType = e.ScheduleType,
            DayOfWeek = e.DayOfWeek,
            SpecificDate = e.SpecificDate?.ToString("yyyy-MM-dd"),
            StartTime = e.StartTime,
            EndTime = e.EndTime,
            IsWorkingDay = e.IsWorkingDay,
            IsFullDay = e.IsFullDay,
            Reason = e.Reason,
            Status = e.Status,
            ProposedByUserId = e.ProposedByUserId?.ToString(),
            ProposedByName = proposedByName,
            ReplacesScheduleId = e.ReplacesScheduleId?.ToString(),
            CreatedByUserId = e.CreatedByUserId.ToString(),
            CreatedAt = e.CreatedAt.ToString("o"),
            UpdatedAt = e.UpdatedAt.ToString("o"),
        };
}
