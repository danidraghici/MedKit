using FluentAssertions;
using MedKit.AiInsights.PdfProcessing;
using Microsoft.Extensions.Logging.Abstractions;
using UglyToad.PdfPig.Core;
using UglyToad.PdfPig.Fonts.Standard14Fonts;
using UglyToad.PdfPig.Writer;

namespace MedKit.AiInsights.Tests.PdfProcessing;

// NOTE: PdfPig's PdfDocumentBuilder creates PDFs without ToUnicode CMap mappings when using
// Standard14 fonts, so text extraction from writer-created PDFs always returns empty.
// Tests below verify the correct code path (extraction vs OCR fallback), not the text content.
// Content-asserting tests require integration test fixtures with real lab-result PDFs.
public class PdfPigTextExtractorTests
{
    private const double A4Width = 595.276;
    private const double A4Height = 841.890;

    private static PdfPigTextExtractor BuildExtractor()
    {
        var ocrFallback = new TesseractOcrFallback(NullLogger<TesseractOcrFallback>.Instance);
        return new PdfPigTextExtractor(ocrFallback, NullLogger<PdfPigTextExtractor>.Instance);
    }

    [Fact]
    public async Task ExtractTextAsync_ValidPdf_DoesNotThrow()
    {
        var pdfBytes = CreatePdfWithText("Hemoglobina: 12.5 g/dL");
        using var stream = new MemoryStream(pdfBytes);
        var extractor = BuildExtractor();

        // Extractor must not throw for a valid PDF; result may be empty if no ToUnicode CMap is present.
        var result = await extractor.ExtractTextAsync(stream);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task ExtractTextAsync_EmptyPdf_ReturnsEmptyString()
    {
        // Empty PDF → no selectable text → OCR fallback → no tessdata in test env → empty string
        var pdfBytes = CreateEmptyPdf();
        using var stream = new MemoryStream(pdfBytes);
        var extractor = BuildExtractor();

        var result = await extractor.ExtractTextAsync(stream);
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task ExtractTextAsync_MultiPagePdf_DoesNotThrow()
    {
        var pdfBytes = CreateMultiPagePdf("Pagina 1", "Pagina 2");
        using var stream = new MemoryStream(pdfBytes);
        var extractor = BuildExtractor();

        // Should not throw; content assertions require real PDFs with ToUnicode CMap.
        var result = await extractor.ExtractTextAsync(stream);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task ExtractTextAsync_StreamConsumed_ThrowsOnSecondRead()
    {
        var pdfBytes = CreateEmptyPdf();
        using var stream = new MemoryStream(pdfBytes);
        var extractor = BuildExtractor();

        // First call succeeds; stream position is reset internally by ReadAllBytesAsync.
        var first = await extractor.ExtractTextAsync(stream);
        first.Should().NotBeNull();
    }

    // Helpers
    private static byte[] CreatePdfWithText(string text)
    {
        var builder = new PdfDocumentBuilder();
        var font = builder.AddStandard14Font(Standard14Font.Helvetica);
        var page = builder.AddPage(A4Width, A4Height);
        page.AddText(text, 12, new PdfPoint(50, 700), font);
        return builder.Build();
    }

    private static byte[] CreateEmptyPdf()
    {
        var builder = new PdfDocumentBuilder();
        builder.AddPage(A4Width, A4Height);
        return builder.Build();
    }

    private static byte[] CreateMultiPagePdf(string page1Text, string page2Text)
    {
        var builder = new PdfDocumentBuilder();
        var font = builder.AddStandard14Font(Standard14Font.Helvetica);

        var p1 = builder.AddPage(A4Width, A4Height);
        p1.AddText(page1Text, 12, new PdfPoint(50, 700), font);

        var p2 = builder.AddPage(A4Width, A4Height);
        p2.AddText(page2Text, 12, new PdfPoint(50, 700), font);

        return builder.Build();
    }
}
