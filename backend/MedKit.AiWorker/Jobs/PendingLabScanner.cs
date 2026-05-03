using Hangfire;
using MedKit.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MedKit.AiWorker.Jobs;

public class PendingLabScanner(
    AppDbContext db,
    IBackgroundJobClient jobs,
    ILogger<PendingLabScanner> logger)
{
    public async Task ScanAsync()
    {
        var pendingIds = await db.LabResults
            .Where(r => r.AiProcessingStatus == "pending")
            .Select(r => r.Id)
            .ToListAsync();

        if (pendingIds.Count == 0)
            return;

        logger.LogInformation("PendingLabScanner: found {Count} pending lab result(s), enqueueing...", pendingIds.Count);

        foreach (var id in pendingIds)
            jobs.Enqueue<LabAnalysisJob>(j => j.ExecuteAsync(id, CancellationToken.None));
    }
}
