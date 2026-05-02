using MedKit.Api.API.DTOs;
using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class LabRequestService(AppDbContext db, LabResultService labResultService, NotificationDeliveryService notificationService)
{
    // DB uses Romanian status values after migration 006.
    // CK_lab_requests_status: ('În așteptare', 'În procesare', 'Finalizat')
    private static readonly HashSet<string> ValidStatusesForDb = ["În așteptare", "În procesare", "Finalizat"];
    private static readonly Dictionary<string, int> StatusOrder = new()
    {
        ["În așteptare"] = 0,
        ["În procesare"] = 1,
        ["Finalizat"] = 2,
    };

    private static string? NormalizeStatusForDb(string? status) => status?.Trim() switch
    {
        "Pending" or "În așteptare" => "În așteptare",
        "In Progress" or "În procesare" => "În procesare",
        "Completed" or "Finalizat" => "Finalizat",
        _ => null,
    };

    // DB already stores Romanian values — pass through as-is.
    private static string NormalizeStatusForClient(string status) => status;

    public async Task<List<LabRequestDto>> GetAllPendingAsync()
    {
        return await FetchDtosAsync(db.LabRequests
            .OrderBy(r => r.Status == "În așteptare" ? 0 : r.Status == "În procesare" ? 1 : 2)
            .ThenByDescending(r => r.CreatedAt));
    }

    public async Task<List<LabRequestDto>> GetByPatientAsync(Guid patientId)
    {
        return await FetchDtosAsync(db.LabRequests
            .Where(r => r.PatientId == patientId)
            .OrderByDescending(r => r.CreatedAt));
    }

    public async Task<Dictionary<Guid, LabRequestDto>> GetByMedicalRecordIdsAsync(List<Guid> recordIds)
    {
        var dtos = await FetchDtosAsync(db.LabRequests
            .Where(r => recordIds.Contains(r.MedicalRecordId)));
        return dtos.ToDictionary(d => Guid.Parse(d.MedicalRecordId));
    }

    public async Task<int> GetUnreadCountAsync()
    {
        return await db.LabRequests.CountAsync(r => r.ViewedByLabAt == null);
    }

    public async Task<string?> MarkReadAsync(Guid requestId, Guid userId)
    {
        var entity = await db.LabRequests.FindAsync(requestId);
        if (entity is null) return "not_found";
        if (entity.ViewedByLabAt is not null) return null;

        await SessionContextHelper.SetAndExecuteAsync(db, userId, async () =>
        {
            entity.ViewedByLabAt = DateTimeOffset.UtcNow;
            entity.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        });
        return null;
    }

    public async Task<(LabRequestDto? Dto, string? Error)> UpdateStatusAsync(
        Guid requestId, string newStatus, Guid userId)
    {
        var newStatusDb = NormalizeStatusForDb(newStatus);
        if (newStatusDb is null || !ValidStatusesForDb.Contains(newStatusDb))
            return (null, "invalid_status");

        var entity = await db.LabRequests.FindAsync(requestId);
        if (entity is null) return (null, "not_found");

        var currentStatusDb = NormalizeStatusForDb(entity.Status);
        if (currentStatusDb is null ||
            !StatusOrder.TryGetValue(currentStatusDb, out var currentOrder) ||
            !StatusOrder.TryGetValue(newStatusDb, out var newOrder) ||
            newOrder <= currentOrder)
            return (null, "invalid_transition");

        await SessionContextHelper.SetAndExecuteAsync(db, userId, async () =>
        {
            entity.Status = newStatusDb;
            entity.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        });

        var dtos = await FetchDtosAsync(db.LabRequests.Where(r => r.Id == requestId));
        return (dtos.FirstOrDefault(), null);
    }

    public async Task<(LabRequestDto? Dto, string? Error)> SubmitResultAsync(
        Guid requestId, Guid userId, string? observations, IFormFile? file)
    {
        if (string.IsNullOrWhiteSpace(observations) && file is null)
            return (null, "observations_or_file_required");

        var entity = await db.LabRequests.FindAsync(requestId);
        if (entity is null) return (null, "not_found");
        if (NormalizeStatusForDb(entity.Status) == "În așteptare") return (null, "must_start_processing_first");

        Guid? labResultId = null;

        if (file is not null)
        {
            var (labResultDto, uploadError) = await labResultService.UploadAsync(entity.PatientId, userId, file);
            if (uploadError is not null) return (null, uploadError);
            labResultId = Guid.Parse(labResultDto!.Id);
        }

        await SessionContextHelper.SetAndExecuteAsync(db, userId, async () =>
        {
            db.LabRequestResults.Add(new LabRequestResultEntity
            {
                Id = Guid.NewGuid(),
                LabRequestId = requestId,
                SubmittedByUserId = userId,
                Observations = string.IsNullOrWhiteSpace(observations) ? null : observations.Trim(),
                LabResultId = labResultId,
                SubmittedAt = DateTimeOffset.UtcNow,
            });

            entity.Status = "Finalizat";
            entity.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        });

        await notificationService.DeliverLabResultAsync(entity.Id);

        var dtos = await FetchDtosAsync(db.LabRequests.Where(r => r.Id == requestId));
        return (dtos.FirstOrDefault(), null);
    }

    // Executes a filtered LabRequests query and maps to full DTOs (two queries: requests + results).
    private async Task<List<LabRequestDto>> FetchDtosAsync(IQueryable<LabRequestEntity> query)
    {
        var rows = await (
            from lr in query
            join p in db.Patients on lr.PatientId equals p.Id into pj
            from patient in pj.DefaultIfEmpty()
            join d in db.Doctors on lr.RequestedByDoctorId equals d.Id into dj
            from doctor in dj.DefaultIfEmpty()
            select new
            {
                lr.Id,
                lr.MedicalRecordId,
                lr.PatientId,
                lr.RequestedByDoctorId,
                lr.SampleTypes,
                lr.Status,
                lr.Notes,
                lr.ViewedByLabAt,
                lr.CreatedAt,
                lr.UpdatedAt,
                PatientName = patient != null ? patient.FullName : "Unknown",
                DoctorName = doctor != null ? doctor.Name : "Unknown",
            }
        ).ToListAsync();

        if (rows.Count == 0) return [];

        var requestIds = rows.Select(r => r.Id).ToList();

        var resultRows = await (
            from rr in db.LabRequestResults
            where requestIds.Contains(rr.LabRequestId)
            join u in db.Users on rr.SubmittedByUserId equals u.Id into uj
            from submitter in uj.DefaultIfEmpty()
            join res in db.LabResults on rr.LabResultId equals res.Id into lj
            from labRes in lj.DefaultIfEmpty()
            orderby rr.SubmittedAt
            select new
            {
                rr.Id,
                rr.LabRequestId,
                rr.SubmittedByUserId,
                rr.Observations,
                rr.LabResultId,
                rr.SubmittedAt,
                SubmitterName = submitter != null ? submitter.Name : "Unknown",
                LabResultFileName = labRes != null ? labRes.OriginalFileName : null,
            }
        ).ToListAsync();

        var resultsByRequest = resultRows
            .GroupBy(r => r.LabRequestId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(r => new LabRequestResultDto
                {
                    Id = r.Id.ToString(),
                    LabRequestId = r.LabRequestId.ToString(),
                    SubmittedByUserId = r.SubmittedByUserId.ToString(),
                    SubmitterName = r.SubmitterName,
                    Observations = r.Observations,
                    LabResultId = r.LabResultId?.ToString(),
                    LabResultFileName = r.LabResultFileName,
                    SubmittedAt = r.SubmittedAt.ToString("o"),
                }).ToList()
            );

        return rows.Select(r => new LabRequestDto
        {
            Id = r.Id.ToString(),
            MedicalRecordId = r.MedicalRecordId.ToString(),
            PatientId = r.PatientId.ToString(),
            PatientName = r.PatientName,
            RequestedByDoctorId = r.RequestedByDoctorId.ToString(),
            RequestedByDoctorName = r.DoctorName,
            SampleTypes = r.SampleTypes.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
            Status = NormalizeStatusForClient(r.Status),
            Notes = r.Notes,
            ViewedByLabAt = r.ViewedByLabAt?.ToString("o"),
            CreatedAt = r.CreatedAt.ToString("o"),
            UpdatedAt = r.UpdatedAt.ToString("o"),
            Results = resultsByRequest.TryGetValue(r.Id, out var res) ? res : [],
        }).ToList();
    }
}
