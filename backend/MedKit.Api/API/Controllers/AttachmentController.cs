using System.Security.Claims;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api")]
public class AttachmentController(AttachmentService attachmentService) : ControllerBase
{
    [HttpPost("medical-records/{medicalRecordId:guid}/attachments")]
    [Authorize(Roles = "specialist_doctor,admin")]
    public async Task<IActionResult> Upload(Guid medicalRecordId, IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        var (dto, error) = await attachmentService.UploadAsync(medicalRecordId, file);

        return error switch
        {
            "invalid_content_type"    => BadRequest(new { error = "Only PDF, JPEG, and PNG files are accepted." }),
            "file_too_large"          => BadRequest(new { error = "File must not exceed 10 MB." }),
            "medical_record_not_found" => NotFound(new { error = "Medical record not found." }),
            null when dto is not null  => CreatedAtAction(nameof(GetFile), new { id = dto.Id }, dto),
            _                         => StatusCode(500, new { error = "Upload failed. Please try again." }),
        };
    }

    [HttpGet("attachments/{id:guid}/file")]
    [Authorize]
    public async Task<IActionResult> GetFile(Guid id)
    {
        var result = await attachmentService.GetFileStreamAsync(id);
        if (result is null)
            return NotFound(new { error = "Attachment not found." });

        var (stream, mimeType, name) = result.Value;
        return File(stream, mimeType, name);
    }
}
