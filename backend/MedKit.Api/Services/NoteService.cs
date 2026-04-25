using MedKit.Api.API.DTOs;
using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class NoteService(AppDbContext db)
{
    public async Task<List<NoteDto>> GetByPatientAsync(Guid patientId)
    {
        return await (
            from n in db.Notes
            join d in db.Doctors on n.AuthorId equals d.Id
            where n.PatientId == patientId
            orderby n.NoteDate descending
            select new NoteDto
            {
                Id         = n.Id.ToString(),
                PatientId  = n.PatientId.ToString(),
                AuthorId   = n.AuthorId.ToString(),
                AuthorName = d.Name,
                NoteDate   = n.NoteDate.ToString("o"),
                Content    = n.Content,
                CreatedAt  = n.CreatedAt.ToString("o"),
            }
        ).ToListAsync();
    }

    public async Task<(NoteDto? Dto, string? Error)> CreateAsync(CreateNoteRequest request, Guid userId)
    {
        if (!Guid.TryParse(request.PatientId, out var patientId))
            return (null, "invalid_patient_id");

        var user = await db.Users.FindAsync(userId);
        if (user?.DoctorId is null)
            return (null, "not_a_doctor");

        var doctor = await db.Doctors.FindAsync(user.DoctorId.Value);
        if (doctor is null)
            return (null, "not_a_doctor");

        var patient = await db.Patients.FindAsync(patientId);
        if (patient is null)
            return (null, "patient_not_found");

        var now = DateTimeOffset.UtcNow;
        var note = new NoteEntity
        {
            Id        = Guid.NewGuid(),
            PatientId = patientId,
            AuthorId  = doctor.Id,
            NoteDate  = now,
            Content   = request.Content,
            CreatedAt = now,
        };

        await SessionContextHelper.SetAndExecuteAsync(db, userId, async () =>
        {
            db.Notes.Add(note);
            await db.SaveChangesAsync();
        });

        return (new NoteDto
        {
            Id         = note.Id.ToString(),
            PatientId  = note.PatientId.ToString(),
            AuthorId   = note.AuthorId.ToString(),
            AuthorName = doctor.Name,
            NoteDate   = note.NoteDate.ToString("o"),
            Content    = note.Content,
            CreatedAt  = note.CreatedAt.ToString("o"),
        }, null);
    }

    public async Task<string?> UpdateAsync(Guid noteId, string content, Guid userId, bool isAdmin)
    {
        var note = await db.Notes.FindAsync(noteId);
        if (note is null) return "not_found";

        if (!isAdmin)
        {
            var user = await db.Users.FindAsync(userId);
            if (user?.DoctorId is null || note.AuthorId != user.DoctorId.Value)
                return "forbidden";
        }

        await SessionContextHelper.SetAndExecuteAsync(db, userId, async () =>
        {
            note.Content = content;
            await db.SaveChangesAsync();
        });

        return null;
    }

    public async Task<string?> DeleteAsync(Guid noteId, Guid userId, bool isAdmin)
    {
        var note = await db.Notes.FindAsync(noteId);
        if (note is null) return "not_found";

        if (!isAdmin)
        {
            var user = await db.Users.FindAsync(userId);
            if (user?.DoctorId is null || note.AuthorId != user.DoctorId.Value)
                return "forbidden";
        }

        await SessionContextHelper.SetAndExecuteAsync(db, userId, async () =>
        {
            db.Notes.Remove(note);
            await db.SaveChangesAsync();
        });

        return null;
    }
}
