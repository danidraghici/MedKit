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
    public DbSet<VitalSignEntity> VitalSigns => Set<VitalSignEntity>();
    public DbSet<PrescribedDrugEntity> PrescribedDrugs => Set<PrescribedDrugEntity>();

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

        modelBuilder.Entity<LabResultEntity>(e =>
        {
            e.ToTable(t => t.UseSqlOutputClause(false));
        });
    }
}
