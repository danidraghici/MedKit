using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Services;
using MedKit.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/dashboard/patient")]
[Authorize(Roles = "patient")]
public class PatientDashboardController(
    AppDbContext ctx,
    AppointmentService appointmentService,
    MedicalRecordService medicalRecordService,
    LabResultService labResultService)
    : ControllerBase
{
    private async Task<Guid?> ResolveCurrentPatientIdAsync()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return null;

        var user = await ctx.Users.FindAsync(userId);
        return user?.PatientId;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var patientId = await ResolveCurrentPatientIdAsync();
        if (patientId is null)
            return Unauthorized();

        var appointments = await appointmentService.GetByPatientAsync(patientId.Value);
        var records = await medicalRecordService.GetByPatientAsync(patientId.Value);
        var labResults = await labResultService.GetByPatientAsync(patientId.Value);

        var nextAppointment = appointments
            .Where(a => a.Status == "Scheduled")
            .OrderBy(a => a.Date)
            .FirstOrDefault()?.Date;

        return Ok(new PatientDashboardOverviewDto(
            UpcomingAppointments: appointments.Count(a => a.Status == "Scheduled"),
            RecentRecords: records.Count,
            LabResults: labResults.Count,
            NextAppointmentDate: nextAppointment
        ));
    }

    [HttpGet("appointments")]
    public async Task<IActionResult> GetAppointments()
    {
        var patientId = await ResolveCurrentPatientIdAsync();
        if (patientId is null)
            return Unauthorized();

        var appointments = await appointmentService.GetByPatientAsync(patientId.Value);
        return Ok(appointments);
    }

    [HttpGet("medical-records")]
    public async Task<IActionResult> GetMedicalRecords()
    {
        var patientId = await ResolveCurrentPatientIdAsync();
        if (patientId is null)
            return Unauthorized();

        var records = await medicalRecordService.GetByPatientAsync(patientId.Value);
        return Ok(records);
    }

    [HttpGet("lab-results")]
    public async Task<IActionResult> GetLabResults()
    {
        var patientId = await ResolveCurrentPatientIdAsync();
        if (patientId is null)
            return Unauthorized();

        var labResults = await labResultService.GetByPatientAsync(patientId.Value);
        return Ok(labResults);
    }
}
