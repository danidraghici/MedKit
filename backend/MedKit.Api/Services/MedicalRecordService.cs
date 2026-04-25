using MedKit.Api.API.DTOs;
using MedKit.Api.API.Helpers;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Services;

public class MedicalRecordService(AppDbContext db)
{
    public async Task<List<MedicalRecordDto>> GetByPatientAsync(Guid patientId)
    {
        var records = await (
            from r in db.MedicalRecords
            join doc in db.Doctors on r.DoctorId equals doc.Id into docJoin
            from doc in docJoin.DefaultIfEmpty()
            where r.PatientId == patientId
            orderby r.VisitDate descending
            select new { Record = r, DoctorName = doc != null ? doc.Name : "Unknown Doctor" }
        ).ToListAsync();

        if (records.Count == 0) return [];

        var recordIds = records.Select(x => x.Record.Id).ToList();

        var vitalsByRecord = await db.VitalSigns
            .Where(v => recordIds.Contains(v.MedicalRecordId))
            .ToDictionaryAsync(v => v.MedicalRecordId);

        var drugsByRecord = await (
            from d in db.PrescribedDrugs
            where recordIds.Contains(d.MedicalRecordId)
            join doc in db.Doctors on d.PrescribedByDoctorId equals doc.Id into docJoin
            from doc in docJoin.DefaultIfEmpty()
            select new { Drug = d, DoctorName = doc != null ? doc.Name : "Unknown Doctor" }
        ).ToListAsync();

        var drugLookup = drugsByRecord
            .GroupBy(x => x.Drug.MedicalRecordId)
            .ToDictionary(g => g.Key, g => g.ToList());

        return records.Select(x =>
        {
            var r = x.Record;
            vitalsByRecord.TryGetValue(r.Id, out var vs);
            drugLookup.TryGetValue(r.Id, out var drugs);

            return new MedicalRecordDto
            {
                Id                 = r.Id.ToString(),
                PatientId          = r.PatientId.ToString(),
                DoctorId           = r.DoctorId.ToString(),
                Doctor             = x.DoctorName,
                Date               = r.VisitDate.ToString("yyyy-MM-dd"),
                VisitType          = r.VisitType,
                ChiefComplaint     = r.ChiefComplaint,
                Diagnosis          = r.Diagnosis,
                IcdCode            = r.IcdCode,
                SecondaryDiagnoses = r.SecondaryDiagnoses,
                Symptoms           = r.Symptoms,
                PhysicalExam       = r.PhysicalExam,
                Treatment          = r.Treatment,
                Procedures         = r.Procedures,
                Urgency            = r.Urgency,
                FollowUpIn         = r.FollowUpIn,
                FollowUpType       = r.FollowUpType,
                Referral           = r.Referral,
                PatientEducation   = r.PatientEducation,
                CreatedAt          = r.CreatedAt.ToString("o"),
                VitalSigns         = vs is null ? null : new VitalSignsDto
                {
                    BloodPressure    = vs.BloodPressure,
                    HeartRate        = vs.HeartRate,
                    Temperature      = vs.Temperature,
                    RespiratoryRate  = vs.RespiratoryRate,
                    OxygenSaturation = vs.OxygenSaturation,
                    Weight           = vs.Weight,
                    Height           = vs.Height,
                },
                PrescribedDrugs = (drugs ?? []).Select(d => new PrescribedDrugDto
                {
                    Id           = d.Drug.Id.ToString(),
                    Name         = d.Drug.Name,
                    GenericName  = d.Drug.GenericName,
                    Dose         = d.Drug.Dose,
                    Route        = d.Drug.Route,
                    Frequency    = d.Drug.Frequency,
                    Duration     = d.Drug.Duration,
                    Quantity     = d.Drug.Quantity,
                    Refills      = d.Drug.Refills,
                    Instructions = d.Drug.Instructions,
                    Indication   = d.Drug.Indication,
                    StartDate    = d.Drug.StartDate?.ToString("yyyy-MM-dd"),
                    EndDate      = d.Drug.EndDate?.ToString("yyyy-MM-dd"),
                    PrescribedBy = d.DoctorName,
                }).ToList(),
            };
        }).ToList();
    }

    public async Task<(MedicalRecordDto? Dto, string? Error)> CreateAsync(
        CreateMedicalRecordRequest request, Guid userId)
    {
        if (!Guid.TryParse(request.PatientId, out var patientId))
            return (null, "invalid_patient_id");

        if (!DateOnly.TryParse(request.Date, out var visitDate))
            return (null, "invalid_date");

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
        var record = new MedicalRecordEntity
        {
            Id                 = Guid.NewGuid(),
            PatientId          = patientId,
            DoctorId           = doctor.Id,
            VisitDate          = visitDate,
            VisitType          = request.VisitType,
            ChiefComplaint     = request.ChiefComplaint,
            Diagnosis          = request.Diagnosis,
            IcdCode            = request.IcdCode,
            SecondaryDiagnoses = request.SecondaryDiagnoses,
            Symptoms           = request.Symptoms,
            PhysicalExam       = request.PhysicalExam,
            Treatment          = request.Treatment,
            Procedures         = request.Procedures,
            Urgency            = request.Urgency,
            FollowUpIn         = request.FollowUpIn,
            FollowUpType       = request.FollowUpType,
            Referral           = request.Referral,
            PatientEducation   = request.PatientEducation,
            CreatedAt          = now,
        };

        VitalSignEntity? vitalSign = null;
        var vs = request.VitalSigns;
        if (vs is not null && (
            vs.BloodPressure is not null || vs.HeartRate is not null ||
            vs.Temperature is not null || vs.RespiratoryRate is not null ||
            vs.OxygenSaturation is not null || vs.Weight is not null || vs.Height is not null))
        {
            vitalSign = new VitalSignEntity
            {
                Id              = Guid.NewGuid(),
                MedicalRecordId = record.Id,
                BloodPressure   = vs.BloodPressure,
                HeartRate       = vs.HeartRate,
                Temperature     = vs.Temperature,
                RespiratoryRate = vs.RespiratoryRate,
                OxygenSaturation = vs.OxygenSaturation,
                Weight          = vs.Weight,
                Height          = vs.Height,
                RecordedAt      = now,
            };
        }

        var drugs = request.PrescribedDrugs.Select(d => new PrescribedDrugEntity
        {
            Id                  = Guid.NewGuid(),
            MedicalRecordId     = record.Id,
            PrescribedByDoctorId = doctor.Id,
            Name                = d.Name,
            GenericName         = d.GenericName,
            Dose                = d.Dose,
            Route               = d.Route,
            Frequency           = d.Frequency,
            Duration            = d.Duration,
            Quantity            = d.Quantity,
            Refills             = d.Refills,
            Instructions        = d.Instructions,
            Indication          = d.Indication,
            StartDate           = d.StartDate is not null && DateOnly.TryParse(d.StartDate, out var sd) ? sd : null,
            EndDate             = d.EndDate is not null && DateOnly.TryParse(d.EndDate, out var ed) ? ed : null,
            CreatedAt           = now,
        }).ToList();

        await SessionContextHelper.SetAndExecuteAsync(db, userId, async () =>
        {
            db.MedicalRecords.Add(record);
            if (vitalSign is not null) db.VitalSigns.Add(vitalSign);
            db.PrescribedDrugs.AddRange(drugs);
            await db.SaveChangesAsync();
        });

        var dto = new MedicalRecordDto
        {
            Id                 = record.Id.ToString(),
            PatientId          = record.PatientId.ToString(),
            DoctorId           = record.DoctorId.ToString(),
            Doctor             = doctor.Name,
            Date               = record.VisitDate.ToString("yyyy-MM-dd"),
            VisitType          = record.VisitType,
            ChiefComplaint     = record.ChiefComplaint,
            Diagnosis          = record.Diagnosis,
            IcdCode            = record.IcdCode,
            SecondaryDiagnoses = record.SecondaryDiagnoses,
            Symptoms           = record.Symptoms,
            PhysicalExam       = record.PhysicalExam,
            Treatment          = record.Treatment,
            Procedures         = record.Procedures,
            Urgency            = record.Urgency,
            FollowUpIn         = record.FollowUpIn,
            FollowUpType       = record.FollowUpType,
            Referral           = record.Referral,
            PatientEducation   = record.PatientEducation,
            CreatedAt          = record.CreatedAt.ToString("o"),
            VitalSigns         = vitalSign is null ? null : new VitalSignsDto
            {
                BloodPressure    = vitalSign.BloodPressure,
                HeartRate        = vitalSign.HeartRate,
                Temperature      = vitalSign.Temperature,
                RespiratoryRate  = vitalSign.RespiratoryRate,
                OxygenSaturation = vitalSign.OxygenSaturation,
                Weight           = vitalSign.Weight,
                Height           = vitalSign.Height,
            },
            PrescribedDrugs = drugs.Select(d => new PrescribedDrugDto
            {
                Id           = d.Id.ToString(),
                Name         = d.Name,
                GenericName  = d.GenericName,
                Dose         = d.Dose,
                Route        = d.Route,
                Frequency    = d.Frequency,
                Duration     = d.Duration,
                Quantity     = d.Quantity,
                Refills      = d.Refills,
                Instructions = d.Instructions,
                Indication   = d.Indication,
                StartDate    = d.StartDate?.ToString("yyyy-MM-dd"),
                EndDate      = d.EndDate?.ToString("yyyy-MM-dd"),
                PrescribedBy = doctor.Name,
            }).ToList(),
        };

        return (dto, null);
    }

    public async Task<(MedicalRecordDto? Dto, string? Error)> UpdateAsync(
        Guid recordId, UpdateMedicalRecordRequest request, Guid userId, bool isAdmin)
    {
        var record = await db.MedicalRecords.FindAsync(recordId);
        if (record is null)
            return (null, "not_found");

        DoctorEntity doctor;

        if (isAdmin)
        {
            var d = await db.Doctors.FindAsync(record.DoctorId);
            if (d is null) return (null, "not_a_doctor");
            doctor = d;
        }
        else
        {
            var user = await db.Users.FindAsync(userId);
            if (user?.DoctorId is null) return (null, "not_a_doctor");
            var d = await db.Doctors.FindAsync(user.DoctorId.Value);
            if (d is null) return (null, "not_a_doctor");
            if (record.DoctorId != d.Id) return (null, "forbidden");
            doctor = d;
        }

        record.VisitType          = request.VisitType;
        record.ChiefComplaint     = request.ChiefComplaint;
        record.Diagnosis          = request.Diagnosis;
        record.IcdCode            = request.IcdCode;
        record.SecondaryDiagnoses = request.SecondaryDiagnoses;
        record.Symptoms           = request.Symptoms;
        record.PhysicalExam       = request.PhysicalExam;
        record.Treatment          = request.Treatment;
        record.Procedures         = request.Procedures;
        record.Urgency            = request.Urgency;
        record.FollowUpIn         = request.FollowUpIn;
        record.FollowUpType       = request.FollowUpType;
        record.Referral           = request.Referral;
        record.PatientEducation   = request.PatientEducation;

        var now = DateTimeOffset.UtcNow;

        var existingVital = await db.VitalSigns.FirstOrDefaultAsync(v => v.MedicalRecordId == recordId);
        var vs = request.VitalSigns;
        var hasVitals = vs is not null && (
            vs.BloodPressure is not null || vs.HeartRate is not null ||
            vs.Temperature is not null || vs.RespiratoryRate is not null ||
            vs.OxygenSaturation is not null || vs.Weight is not null || vs.Height is not null);

        VitalSignEntity? updatedVital = null;
        if (hasVitals)
        {
            if (existingVital is not null)
            {
                existingVital.BloodPressure    = vs!.BloodPressure;
                existingVital.HeartRate        = vs.HeartRate;
                existingVital.Temperature      = vs.Temperature;
                existingVital.RespiratoryRate  = vs.RespiratoryRate;
                existingVital.OxygenSaturation = vs.OxygenSaturation;
                existingVital.Weight           = vs.Weight;
                existingVital.Height           = vs.Height;
                updatedVital = existingVital;
            }
            else
            {
                updatedVital = new VitalSignEntity
                {
                    Id              = Guid.NewGuid(),
                    MedicalRecordId = recordId,
                    BloodPressure   = vs!.BloodPressure,
                    HeartRate       = vs.HeartRate,
                    Temperature     = vs.Temperature,
                    RespiratoryRate = vs.RespiratoryRate,
                    OxygenSaturation = vs.OxygenSaturation,
                    Weight          = vs.Weight,
                    Height          = vs.Height,
                    RecordedAt      = now,
                };
                db.VitalSigns.Add(updatedVital);
            }
        }
        else if (existingVital is not null)
        {
            db.VitalSigns.Remove(existingVital);
        }

        var oldDrugs = await db.PrescribedDrugs.Where(d => d.MedicalRecordId == recordId).ToListAsync();
        db.PrescribedDrugs.RemoveRange(oldDrugs);

        var newDrugs = request.PrescribedDrugs.Select(d => new PrescribedDrugEntity
        {
            Id                   = Guid.NewGuid(),
            MedicalRecordId      = recordId,
            PrescribedByDoctorId = doctor.Id,
            Name                 = d.Name,
            GenericName          = d.GenericName,
            Dose                 = d.Dose,
            Route                = d.Route,
            Frequency            = d.Frequency,
            Duration             = d.Duration,
            Quantity             = d.Quantity,
            Refills              = d.Refills,
            Instructions         = d.Instructions,
            Indication           = d.Indication,
            StartDate            = d.StartDate is not null && DateOnly.TryParse(d.StartDate, out var sd) ? sd : null,
            EndDate              = d.EndDate is not null && DateOnly.TryParse(d.EndDate, out var ed) ? ed : null,
            CreatedAt            = now,
        }).ToList();

        db.PrescribedDrugs.AddRange(newDrugs);

        await SessionContextHelper.SetAndExecuteAsync(db, userId, async () =>
        {
            await db.SaveChangesAsync();
        });

        var dto = new MedicalRecordDto
        {
            Id                 = record.Id.ToString(),
            PatientId          = record.PatientId.ToString(),
            DoctorId           = record.DoctorId.ToString(),
            Doctor             = doctor.Name,
            Date               = record.VisitDate.ToString("yyyy-MM-dd"),
            VisitType          = record.VisitType,
            ChiefComplaint     = record.ChiefComplaint,
            Diagnosis          = record.Diagnosis,
            IcdCode            = record.IcdCode,
            SecondaryDiagnoses = record.SecondaryDiagnoses,
            Symptoms           = record.Symptoms,
            PhysicalExam       = record.PhysicalExam,
            Treatment          = record.Treatment,
            Procedures         = record.Procedures,
            Urgency            = record.Urgency,
            FollowUpIn         = record.FollowUpIn,
            FollowUpType       = record.FollowUpType,
            Referral           = record.Referral,
            PatientEducation   = record.PatientEducation,
            CreatedAt          = record.CreatedAt.ToString("o"),
            VitalSigns         = (hasVitals && updatedVital is not null) ? new VitalSignsDto
            {
                BloodPressure    = updatedVital.BloodPressure,
                HeartRate        = updatedVital.HeartRate,
                Temperature      = updatedVital.Temperature,
                RespiratoryRate  = updatedVital.RespiratoryRate,
                OxygenSaturation = updatedVital.OxygenSaturation,
                Weight           = updatedVital.Weight,
                Height           = updatedVital.Height,
            } : null,
            PrescribedDrugs = newDrugs.Select(d => new PrescribedDrugDto
            {
                Id           = d.Id.ToString(),
                Name         = d.Name,
                GenericName  = d.GenericName,
                Dose         = d.Dose,
                Route        = d.Route,
                Frequency    = d.Frequency,
                Duration     = d.Duration,
                Quantity     = d.Quantity,
                Refills      = d.Refills,
                Instructions = d.Instructions,
                Indication   = d.Indication,
                StartDate    = d.StartDate?.ToString("yyyy-MM-dd"),
                EndDate      = d.EndDate?.ToString("yyyy-MM-dd"),
                PrescribedBy = doctor.Name,
            }).ToList(),
        };

        return (dto, null);
    }
}
