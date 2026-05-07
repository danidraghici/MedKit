using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize(Roles = "admin,specialist_doctor")]
public class VoiceToRecordController(VoiceToRecordService service) : ControllerBase
{
    [HttpPost("voice-to-medical-record")]
    [RequestSizeLimit(26_214_400)] // 25 MB + overhead
    public async Task<IActionResult> VoiceToMedicalRecord(
        IFormFile audio, CancellationToken ct)
    {
        if (audio is null || audio.Length == 0)
            return BadRequest(new { error = "no_audio" });

        var (result, error) = await service.ProcessAsync(audio, ct);

        if (error is not null)
        {
            return error switch
            {
                "audio_too_large"        => BadRequest(new { error }),
                "unsupported_audio_format" => BadRequest(new { error }),
                "empty_transcript"       => BadRequest(new { error }),
                _ => StatusCode(502, new { error }),
            };
        }

        return Ok(result);
    }
}
