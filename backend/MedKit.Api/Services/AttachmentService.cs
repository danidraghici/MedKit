using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class AttachmentService(AppDbContext db, IConfiguration config)
{
    private static readonly HashSet<string> AllowedContentTypes =
    [
        "application/pdf",
        "image/jpeg",
        "image/png",
    ];

    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    private string UploadPath => config["FileStorage:UploadPath"] ?? "Uploads";

    public async Task<(AttachmentDto? Dto, string? Error)> UploadAsync(
        Guid medicalRecordId, IFormFile file)
    {
        if (!AllowedContentTypes.Contains(file.ContentType))
            return (null, "invalid_content_type");

        if (file.Length > MaxFileSizeBytes)
            return (null, "file_too_large");

        var recordExists = await db.MedicalRecords.AnyAsync(r => r.Id == medicalRecordId);
        if (!recordExists)
            return (null, "medical_record_not_found");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var dir = Path.Combine(UploadPath, "attachments", medicalRecordId.ToString());
        Directory.CreateDirectory(dir);
        var filePath = Path.Combine(dir, $"{Guid.NewGuid()}{ext}");

        await using var inputStream = file.OpenReadStream();
        await using var fileStream = System.IO.File.Create(filePath);
        await inputStream.CopyToAsync(fileStream);

        var entity = new AttachmentEntity
        {
            Id              = Guid.NewGuid(),
            MedicalRecordId = medicalRecordId,
            Name            = file.FileName,
            MimeType        = file.ContentType,
            Url             = filePath,
            SizeBytes       = (int)file.Length,
            UploadedAt      = DateTimeOffset.UtcNow,
        };

        db.Attachments.Add(entity);
        await db.SaveChangesAsync();

        return (ToDto(entity), null);
    }

    public async Task<(Stream Stream, string MimeType, string Name)?> GetFileStreamAsync(Guid attachmentId)
    {
        var entity = await db.Attachments.FindAsync(attachmentId);
        if (entity is null) return null;

        var stream = System.IO.File.OpenRead(entity.Url);
        return (stream, entity.MimeType, entity.Name);
    }

    public async Task<List<AttachmentDto>> GetByMedicalRecordAsync(Guid medicalRecordId)
    {
        return await db.Attachments
            .Where(a => a.MedicalRecordId == medicalRecordId)
            .OrderBy(a => a.UploadedAt)
            .Select(a => ToDto(a))
            .ToListAsync();
    }

    private static AttachmentDto ToDto(AttachmentEntity a) => new()
    {
        Id              = a.Id.ToString(),
        MedicalRecordId = a.MedicalRecordId.ToString(),
        Name            = a.Name,
        Type            = a.MimeType,
        Size            = a.SizeBytes,
        UploadedAt      = a.UploadedAt.ToString("o"),
    };
}
