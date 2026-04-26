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
            return BadRequest(new { error = "Nu a fost furnizat niciun fișier." });

        var (dto, error) = await attachmentService.UploadAsync(medicalRecordId, file);

        return error switch
        {
            "invalid_content_type"    => BadRequest(new { error = "Sunt acceptate doar fișiere PDF, JPEG și PNG." }),
            "file_too_large"          => BadRequest(new { error = "Fișierul nu trebuie să depășească 10 MB." }),
            "medical_record_not_found" => NotFound(new { error = "Fișa medicală nu a fost găsită." }),
            null when dto is not null  => CreatedAtAction(nameof(GetFile), new { id = dto.Id }, dto),
            _                         => StatusCode(500, new { error = "Încărcarea a eșuat. Vă rugăm să încercați din nou." }),
        };
    }

    [HttpGet("attachments/{id:guid}/file")]
    [Authorize]
    public async Task<IActionResult> GetFile(Guid id)
    {
        var result = await attachmentService.GetFileStreamAsync(id);
        if (result is null)
            return NotFound(new { error = "Atașamentul nu a fost găsit." });

        var (stream, mimeType, name) = result.Value;
        return File(stream, mimeType, name);
    }
}
