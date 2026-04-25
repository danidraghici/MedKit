using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class LabResultService(AppDbContext db, IConfiguration config)
{
    private static readonly HashSet<string> AllowedContentTypes =
    [
        "application/pdf",
        "image/jpeg",
        "image/png",
    ];

    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    private string UploadPath => config["FileStorage:UploadPath"] ?? "Uploads";

    public async Task<List<LabResultDto>> GetByPatientAsync(Guid patientId)
    {
        return await (
            from lr in db.LabResults
            join u in db.Users on lr.UploadedByUserId equals u.Id into userJoin
            from uploader in userJoin.DefaultIfEmpty()
            where lr.PatientId == patientId
            orderby lr.UploadedAt descending
            select new LabResultDto
            {
                Id               = lr.Id.ToString(),
                PatientId        = lr.PatientId.ToString(),
                UploadedByUserId = lr.UploadedByUserId.ToString(),
                UploaderName     = uploader != null ? uploader.Name : "Unknown",
                OriginalFileName = lr.OriginalFileName,
                ContentType      = lr.ContentType,
                FileSizeBytes    = lr.FileSizeBytes,
                UploadedAt       = lr.UploadedAt.ToString("o"),
            }
        ).ToListAsync();
    }

    public async Task<(LabResultDto? Dto, string? Error)> UploadAsync(
        Guid patientId, Guid userId, IFormFile file)
    {
        if (!AllowedContentTypes.Contains(file.ContentType))
            return (null, "invalid_content_type");

        if (file.Length > MaxFileSizeBytes)
            return (null, "file_too_large");

        var patient = await db.Patients.FindAsync(patientId);
        if (patient is null)
            return (null, "patient_not_found");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var dir = Path.Combine(UploadPath, "lab-results", patientId.ToString());
        Directory.CreateDirectory(dir);
        var filePath = Path.Combine(dir, $"{Guid.NewGuid()}{ext}");

        await using var inputStream = file.OpenReadStream();
        await using var fileStream = System.IO.File.Create(filePath);
        await inputStream.CopyToAsync(fileStream);

        var now = DateTimeOffset.UtcNow;
        var entity = new LabResultEntity
        {
            Id               = Guid.NewGuid(),
            PatientId        = patientId,
            UploadedByUserId = userId,
            OriginalFileName = file.FileName,
            BlobName         = filePath,
            ContentType      = file.ContentType,
            FileSizeBytes    = file.Length,
            UploadedAt       = now,
        };

        db.LabResults.Add(entity);
        await db.SaveChangesAsync();

        var uploader = await db.Users.FindAsync(userId);
        return (new LabResultDto
        {
            Id               = entity.Id.ToString(),
            PatientId        = entity.PatientId.ToString(),
            UploadedByUserId = entity.UploadedByUserId.ToString(),
            UploaderName     = uploader?.Name ?? "Unknown",
            OriginalFileName = entity.OriginalFileName,
            ContentType      = entity.ContentType,
            FileSizeBytes    = entity.FileSizeBytes,
            UploadedAt       = entity.UploadedAt.ToString("o"),
        }, null);
    }

    public async Task<(Stream Stream, string ContentType, string OriginalFileName)?> GetFileStreamAsync(Guid labResultId)
    {
        var entity = await db.LabResults.FindAsync(labResultId);
        if (entity is null) return null;

        var stream = System.IO.File.OpenRead(entity.BlobName);
        return (stream, entity.ContentType, entity.OriginalFileName);
    }
}
