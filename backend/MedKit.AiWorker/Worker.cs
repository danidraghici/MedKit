namespace MedKit.AiWorker;

// Hangfire server is registered as a hosted service in Program.cs.
// This class is retained as a no-op so the SDK worker template compiles without changes.
public sealed class Worker : BackgroundService
{
    protected override Task ExecuteAsync(CancellationToken stoppingToken) => Task.CompletedTask;
}
