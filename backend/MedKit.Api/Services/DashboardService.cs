using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class DashboardService(AppDbContext db)
{
    public async Task<DashboardStatsDto> GetStatsAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var thirtyDaysAgo = today.AddDays(-30);
        var thirtyDaysFromNow = today.AddDays(30);

        var recentRecords = await db.MedicalRecords
            .CountAsync(r => r.VisitDate >= thirtyDaysAgo);

        var upcomingAppointments = await db.Appointments
            .CountAsync(a => a.AppointmentDate >= today
                          && a.AppointmentDate <= thirtyDaysFromNow
                          && a.Status == "Programat");

        var activeDoctors = await db.Users
            .CountAsync(u => (u.Role == "specialist_doctor" || u.Role == "lab_doctor")
                          && u.IsActive);

        return new DashboardStatsDto(recentRecords, upcomingAppointments, activeDoctors);
    }

    public async Task<List<DoctorSummaryDto>> GetStaffAsync()
    {
        return await db.Doctors
            .Include(d => d.DepartmentNav)
            .OrderBy(d => d.Name)
            .Select(d => new DoctorSummaryDto(
                d.Id.ToString(),
                d.Name,
                d.Email,
                d.Phone,
                d.LicenseNumber,
                d.Specialty,
                d.DepartmentId.HasValue ? d.DepartmentId.Value.ToString() : "",
                d.DepartmentNav != null ? d.DepartmentNav.Name : "",
                d.DoctorRole))
            .ToListAsync();
    }
}
