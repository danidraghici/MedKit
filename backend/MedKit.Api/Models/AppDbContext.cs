using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.Models;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<UserEntity> Users => Set<UserEntity>();
    public DbSet<RefreshTokenEntity> RefreshTokens => Set<RefreshTokenEntity>();
    public DbSet<AuditLogEntity> AuditLogs => Set<AuditLogEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserEntity>(e =>
        {
            e.HasMany(u => u.RefreshTokens)
             .WithOne(rt => rt.User)
             .HasForeignKey(rt => rt.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshTokenEntity>(e =>
        {
            e.Property(rt => rt.CreatedAt)
             .HasDefaultValueSql("SYSDATETIMEOFFSET()");
        });

        // audit_logs is append-only — disable EF Core from tracking updates/deletes
        modelBuilder.Entity<AuditLogEntity>(e =>
        {
            e.Property(a => a.PerformedAt)
             .HasDefaultValueSql("SYSDATETIMEOFFSET()");
        });
    }
}
