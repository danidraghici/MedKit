using Microsoft.Extensions.Logging;
using Tesseract;
using UglyToad.PdfPig;

namespace MedKit.AiInsights.PdfProcessing;

/// <summary>
/// OCR fallback for scanned PDFs where PdfPig finds no selectable text.
/// Requires a tessdata/ folder with ron.traineddata and eng.traineddata
/// alongside the process binary (or set TESSDATA_PREFIX env var).
/// </summary>
public class TesseractOcrFallback
{
    private readonly ILogger<TesseractOcrFallback> _logger;

    private const string TessDataPath = "tessdata";
    private const string Languages = "ron+eng";

    public TesseractOcrFallback(ILogger<TesseractOcrFallback> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Renders each PDF page to a bitmap and extracts text via Tesseract.
    /// Returns an empty string if tessdata is unavailable or rendering fails.
    /// </summary>
    public async Task<string> ExtractAsync(byte[] pdfBytes, CancellationToken ct = default)
    {
        return await Task.Run(() =>
        {
            try
            {
                return RunOcr(pdfBytes, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Tesseract OCR failed — returning empty string");
                return "";
            }
        }, ct);
    }

    private string RunOcr(byte[] pdfBytes, CancellationToken ct)
    {
        using var engine = new TesseractEngine(TessDataPath, Languages, EngineMode.Default);
        using var doc = PdfDocument.Open(pdfBytes);
        var sb = new System.Text.StringBuilder();

        foreach (var page in doc.GetPages())
        {
            ct.ThrowIfCancellationRequested();

            var imageBytes = RenderPageToBytes(pdfBytes, page.Number);
            if (imageBytes is null)
            {
                _logger.LogDebug("Page {N}: rendering returned null, skipping OCR", page.Number);
                continue;
            }

            using var pix = Pix.LoadFromMemory(imageBytes);
            using var tessPage = engine.Process(pix);
            var text = tessPage.GetText();
            sb.AppendLine(text);

            _logger.LogDebug("OCR page {N}: confidence={Conf:F1}%", page.Number, tessPage.GetMeanConfidence() * 100);
        }

        return sb.ToString().Trim();
    }

    // Renders a single PDF page to a PNG byte array at 150 DPI.
    // PdfPig 0.1.x does not include a built-in rasterizer; swap this implementation
    // for SkiaSharp, PdfiumViewer, or another renderer when available on the target OS.
    private byte[]? RenderPageToBytes(byte[] pdfBytes, int pageNumber)
    {
        try
        {
            // Placeholder: open the document and check the page exists.
            // Replace the body of this method with an actual rasterizer call.
            using var doc = PdfDocument.Open(pdfBytes);
            var pages = doc.GetPages().ToList();
            if (pageNumber < 1 || pageNumber > pages.Count)
                return null;

            // Until a rasterizer is integrated, return null so OCR is skipped.
            _logger.LogDebug("PDF rasterizer not configured — OCR skipped for page {N}", pageNumber);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to render page {N} for OCR", pageNumber);
            return null;
        }
    }
}
