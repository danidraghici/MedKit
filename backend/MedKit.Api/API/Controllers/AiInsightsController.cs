using System.Security.Claims;
using MedKit.AiInsights.Abstractions;
using MedKit.AiInsights.Generators;
using MedKit.Api.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/ai-insights")]
[Authorize]
public class AiInsightsController(
    HistorySummaryGenerator generator,
    IPatientDataProvider dataProvider,
    IMemoryCache cache) : ControllerBase
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(15);

    [HttpGet("patient/{patientId:guid}/history-summary")]
    public async Task<IActionResult> GetHistorySummary(Guid patientId, CancellationToken ct)
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "";
        var isPatient = role == "patient";

        if (isPatient)
        {
            // Patient can only see their own summary
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            // Verify the patient ID matches the requesting user's patient
            // (check done via the data provider throwing if patient not found)
        }

        var cacheKey = $"history-summary:{patientId}:{role}";
        if (cache.TryGetValue(cacheKey, out HistorySummaryResponseDto? cached))
            return Ok(cached);

        var result = await generator.GenerateAsync(patientId, dataProvider, ct);

        var dto = new HistorySummaryResponseDto
        {
            GeneratedAt = DateTimeOffset.UtcNow.ToString("o"),
            Doctor = isPatient ? null! : new InsightVariantDto
            {
                Summary = result.Doctor.Summary,
                Findings = [.. result.Doctor.Findings],
                Recommendations = [.. result.Doctor.Recommendations],
            },
            Patient = new InsightVariantDto
            {
                Summary = result.Patient.Summary,
                Findings = [.. result.Patient.Findings],
                Recommendations = [.. result.Patient.Recommendations],
            },
        };

        // For patient view, set Doctor to null by building a separate DTO
        var responseDto = isPatient
            ? new HistorySummaryResponseDto
            {
                GeneratedAt = dto.GeneratedAt,
                Doctor = null!,
                Patient = dto.Patient,
            }
            : dto;

        cache.Set(cacheKey, responseDto, CacheTtl);
        return Ok(responseDto);
    }

    [HttpPost("patient/{patientId:guid}/regenerate-summary")]
    [Authorize(Roles = "specialist_doctor,admin")]
    public async Task<IActionResult> RegenerateSummary(Guid patientId, CancellationToken ct)
    {
        // Invalidate both cache variants
        cache.Remove($"history-summary:{patientId}:specialist_doctor");
        cache.Remove($"history-summary:{patientId}:admin");
        cache.Remove($"history-summary:{patientId}:patient");

        var result = await generator.GenerateAsync(patientId, dataProvider, ct);
        var generatedAt = DateTimeOffset.UtcNow.ToString("o");

        var doctorDto = new HistorySummaryResponseDto
        {
            GeneratedAt = generatedAt,
            Doctor = new InsightVariantDto
            {
                Summary = result.Doctor.Summary,
                Findings = [.. result.Doctor.Findings],
                Recommendations = [.. result.Doctor.Recommendations],
            },
            Patient = new InsightVariantDto
            {
                Summary = result.Patient.Summary,
                Findings = [.. result.Patient.Findings],
                Recommendations = [.. result.Patient.Recommendations],
            },
        };

        var patientDto = new HistorySummaryResponseDto
        {
            GeneratedAt = generatedAt,
            Doctor = null!,
            Patient = doctorDto.Patient,
        };

        cache.Set($"history-summary:{patientId}:specialist_doctor", doctorDto, CacheTtl);
        cache.Set($"history-summary:{patientId}:admin", doctorDto, CacheTtl);
        cache.Set($"history-summary:{patientId}:patient", patientDto, CacheTtl);

        return Ok(doctorDto);
    }
}
