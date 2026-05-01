using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Models;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<UserEntity> Users => Set<UserEntity>();
    public DbSet<RefreshTokenEntity> RefreshTokens => Set<RefreshTokenEntity>();
    public DbSet<AuditLogEntity> AuditLogs => Set<AuditLogEntity>();
    public DbSet<PatientEntity> Patients => Set<PatientEntity>();
    public DbSet<MedicalRecordEntity> MedicalRecords => Set<MedicalRecordEntity>();
    public DbSet<AppointmentEntity> Appointments => Set<AppointmentEntity>();
    public DbSet<DoctorEntity> Doctors => Set<DoctorEntity>();
    public DbSet<DepartmentEntity> Departments => Set<DepartmentEntity>();
    public DbSet<UserProfileEntity> UserProfiles => Set<UserProfileEntity>();
    public DbSet<NotificationRuleEntity> NotificationRules => Set<NotificationRuleEntity>();
    public DbSet<NoteEntity> Notes => Set<NoteEntity>();
    public DbSet<LabResultEntity> LabResults => Set<LabResultEntity>();
    public DbSet<LabRequestEntity> LabRequests => Set<LabRequestEntity>();
    public DbSet<LabRequestResultEntity> LabRequestResults => Set<LabRequestResultEntity>();
    public DbSet<VitalSignEntity> VitalSigns => Set<VitalSignEntity>();
    public DbSet<PrescribedDrugEntity> PrescribedDrugs => Set<PrescribedDrugEntity>();
    public DbSet<AttachmentEntity> Attachments => Set<AttachmentEntity>();
    public DbSet<DoctorScheduleEntity> DoctorSchedules => Set<DoctorScheduleEntity>();
    public DbSet<UserNotificationEntity> UserNotifications => Set<UserNotificationEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserEntity>(e =>
        {
            e.HasMany(u => u.RefreshTokens)
             .WithOne(rt => rt.User)
             .HasForeignKey(rt => rt.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(u => u.Profile)
             .WithOne(p => p.User)
             .HasForeignKey<UserProfileEntity>(p => p.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            // users table has audit triggers — OUTPUT clause is forbidden on triggered tables in SQL Server
            e.ToTable(t => t.UseSqlOutputClause(false));
        });

        modelBuilder.Entity<RefreshTokenEntity>(e =>
        {
            e.Property(rt => rt.CreatedAt)
             .HasDefaultValueSql("SYSDATETIMEOFFSET()");
        });

        modelBuilder.Entity<PatientEntity>(e =>
        {
            // patients table has audit trigger — OUTPUT clause is forbidden on triggered tables
            e.ToTable(t => t.UseSqlOutputClause(false));

            e.HasOne(p => p.User)
             .WithOne(u => u.Patient)
             .HasForeignKey<UserEntity>(u => u.PatientId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // audit_logs is append-only — disable EF Core from tracking updates/deletes
        modelBuilder.Entity<AuditLogEntity>(e =>
        {
            e.Property(a => a.PerformedAt)
             .HasDefaultValueSql("SYSDATETIMEOFFSET()");

            // audit_logs has protect triggers — OUTPUT clause is forbidden on triggered tables
            e.ToTable(t => t.UseSqlOutputClause(false));
        });

        modelBuilder.Entity<MedicalRecordEntity>(e =>
        {
            // medical_records has audit trigger — OUTPUT clause is forbidden on triggered tables
            e.ToTable(t => t.UseSqlOutputClause(false));

            e.HasOne(r => r.VitalSign)
             .WithOne()
             .HasForeignKey<VitalSignEntity>(v => v.MedicalRecordId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasMany(r => r.PrescribedDrugs)
             .WithOne()
             .HasForeignKey(d => d.MedicalRecordId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<VitalSignEntity>(e =>
        {
            e.ToTable(t => t.UseSqlOutputClause(false));
        });

        modelBuilder.Entity<PrescribedDrugEntity>(e =>
        {
            e.ToTable(t => t.UseSqlOutputClause(false));
        });

        modelBuilder.Entity<AppointmentEntity>(e =>
        {
            // appointments has audit trigger — OUTPUT clause is forbidden on triggered tables
            e.ToTable(t => t.UseSqlOutputClause(false));
        });

        modelBuilder.Entity<DepartmentEntity>(e =>
        {
            // departments has audit trigger — OUTPUT clause is forbidden on triggered tables
            e.ToTable(t => t.UseSqlOutputClause(false));
        });

        modelBuilder.Entity<DoctorEntity>(e =>
        {
            // doctors has audit trigger — OUTPUT clause is forbidden on triggered tables
            e.ToTable(t => t.UseSqlOutputClause(false));

            e.HasOne(d => d.DepartmentNav)
             .WithMany()
             .HasForeignKey(d => d.DepartmentId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<NotificationRuleEntity>(e =>
        {
            // notification_rules has audit trigger — OUTPUT clause is forbidden on triggered tables
            e.ToTable(t => t.UseSqlOutputClause(false));
        });

        modelBuilder.Entity<NoteEntity>(e =>
        {
            // notes has audit trigger — OUTPUT clause is forbidden on triggered tables
            e.ToTable(t => t.UseSqlOutputClause(false));
        });

        modelBuilder.Entity<AttachmentEntity>(e =>
        {
            e.ToTable(t => t.UseSqlOutputClause(false));

            e.HasOne<MedicalRecordEntity>()
             .WithMany(r => r.Attachments)
             .HasForeignKey(a => a.MedicalRecordId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LabResultEntity>(e =>
        {
            e.ToTable(t => t.UseSqlOutputClause(false));
        });

        modelBuilder.Entity<LabRequestEntity>(e =>
        {
            // lab_requests has audit trigger — OUTPUT clause is forbidden on triggered tables
            e.ToTable(t => t.UseSqlOutputClause(false));

            // Explicit FK so EF Core inserts medical_records before lab_requests
            e.HasOne<MedicalRecordEntity>()
             .WithMany()
             .HasForeignKey(r => r.MedicalRecordId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasMany(r => r.Results)
             .WithOne()
             .HasForeignKey(rr => rr.LabRequestId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LabRequestResultEntity>(e =>
        {
            e.HasOne<LabResultEntity>()
             .WithMany()
             .HasForeignKey(rr => rr.LabResultId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<UserNotificationEntity>(e =>
        {
            e.HasOne<UserEntity>()
             .WithMany()
             .HasForeignKey(n => n.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne<NotificationRuleEntity>()
             .WithMany()
             .HasForeignKey(n => n.NotificationRuleId)
             .OnDelete(DeleteBehavior.SetNull);

            e.Property(n => n.CreatedAt)
             .HasDefaultValueSql("SYSDATETIMEOFFSET()");
        });

        modelBuilder.Entity<DoctorScheduleEntity>(e =>
        {
            e.HasOne(s => s.Doctor)
             .WithMany()
             .HasForeignKey(s => s.DoctorId)
             .OnDelete(DeleteBehavior.Cascade);

            // Self-referencing FK — must be NO ACTION to avoid multiple cascade paths in SQL Server
            e.HasOne<DoctorScheduleEntity>()
             .WithMany()
             .HasForeignKey(s => s.ReplacesScheduleId)
             .OnDelete(DeleteBehavior.NoAction);

            e.HasOne<UserEntity>()
             .WithMany()
             .HasForeignKey(s => s.ProposedByUserId)
             .OnDelete(DeleteBehavior.NoAction);

            e.HasOne<UserEntity>()
             .WithMany()
             .HasForeignKey(s => s.CreatedByUserId)
             .OnDelete(DeleteBehavior.NoAction);
        });
    }
}
