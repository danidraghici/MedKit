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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserEntity>(e =>
        {
            e.HasMany(u => u.RefreshTokens)
             .WithOne(rt => rt.User)
             .HasForeignKey(rt => rt.UserId)
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
    }
}
