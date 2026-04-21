using MedKit.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedKit.Api.API.Helpers;

/// <summary>
/// Sets SQL Server SESSION_CONTEXT(N'app_user_id') on the same connection that
/// executes the subsequent DML so audit triggers can read the acting user's ID.
///
/// Must be called inside a BeginTransactionAsync block — the transaction pins
/// a single connection from the pool for its entire duration.
/// </summary>
public static class SessionContextHelper
{
    public static async Task SetAndExecuteAsync(
        AppDbContext ctx,
        Guid userId,
        Func<Task> action)
    {
        await using var tx = await ctx.Database.BeginTransactionAsync();
        try
        {
            // @p0 is the Guid serialised as a string; sp_set_session_context accepts sql_variant
            await ctx.Database.ExecuteSqlRawAsync(
                "EXEC sp_set_session_context N'app_user_id', @p0, @read_only = 0",
                userId.ToString());

            await action();

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}
