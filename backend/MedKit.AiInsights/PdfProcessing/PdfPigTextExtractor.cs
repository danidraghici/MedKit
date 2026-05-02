using MedKit.AiInsights.Abstractions;
using Microsoft.Extensions.Logging;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace MedKit.AiInsights.PdfProcessing;

public class PdfPigTextExtractor : IPdfTextExtractor
{
    private readonly TesseractOcrFallback _ocr;
    private readonly ILogger<PdfPigTextExtractor> _logger;

    // If selectable text is shorter than this threshold (chars), assume a scanned PDF
    // and fall back to OCR.
    private const int OcrFallbackThreshold = 50;

    public PdfPigTextExtractor(TesseractOcrFallback ocr, ILogger<PdfPigTextExtractor> logger)
    {
        _ocr = ocr;
        _logger = logger;
    }

    public async Task<string> ExtractTextAsync(Stream pdfStream, CancellationToken ct = default)
    {
        var pdfBytes = await ReadAllBytesAsync(pdfStream, ct);
        var text = ExtractSelectableText(pdfBytes);

        if (text.Length < OcrFallbackThreshold)
        {
            _logger.LogInformation(
                "Selectable text too short ({Len} chars) — switching to OCR", text.Length);
            text = await _ocr.ExtractAsync(pdfBytes, ct);
        }

        return text;
    }

    private static string ExtractSelectableText(byte[] pdfBytes)
    {
        using var doc = PdfDocument.Open(pdfBytes);
        var sb = new System.Text.StringBuilder();

        foreach (var page in doc.GetPages())
        {
            // page.Text uses letter-level extraction which works for most PDFs.
            // Fall back to joining Letters.Value directly for PDFs where page.Text returns empty
            // but letters are still present (e.g., some embedded-font PDFs).
            var text = page.Text;
            if (string.IsNullOrWhiteSpace(text))
                text = string.Concat(page.Letters.Select(l => l.Value));

            sb.AppendLine(text);
        }

        return sb.ToString().Trim();
    }

    private static async Task<byte[]> ReadAllBytesAsync(Stream stream, CancellationToken ct)
    {
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, ct);
        return ms.ToArray();
    }
}
