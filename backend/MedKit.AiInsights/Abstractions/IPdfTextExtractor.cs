namespace MedKit.AiInsights.Abstractions;

public interface IPdfTextExtractor
{
    Task<string> ExtractTextAsync(Stream pdfStream, CancellationToken ct = default);
}
