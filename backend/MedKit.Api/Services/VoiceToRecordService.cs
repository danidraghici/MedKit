using System.Net.Http.Headers;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using MedKit.AiInsights.Abstractions;
using MedKit.AiInsights.Llm;
using MedKit.AiInsights.Models;
using MedKit.Api.API.DTOs;
using Microsoft.Extensions.Options;

namespace MedKit.Api.Services;

public class VoiceToRecordService(
    ILlmClient llm,
    IHttpClientFactory httpClientFactory,
    IOptions<AiInsightsOptions> opts,
    ILogger<VoiceToRecordService> logger)
{
    private static readonly HashSet<string> AllowedAudioTypes =
    [
        "audio/webm",
        "audio/ogg",
        "audio/mpeg",
        "audio/mp4",
        "audio/wav",
        "audio/x-wav",
        "audio/mp3",
        "video/webm",   // Chrome records as video/webm even for audio-only
    ];

    private const long MaxAudioSizeBytes = 25 * 1024 * 1024; // 25 MB (Groq limit)

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public async Task<(VoiceToMedicalRecordResponse? Result, string? Error)> ProcessAsync(
        IFormFile audio, CancellationToken ct = default)
    {
        if (audio.Length > MaxAudioSizeBytes)
            return (null, "audio_too_large");

        // Validate content type — browsers may report video/webm for audio-only WebM recordings
        var contentType = audio.ContentType.ToLowerInvariant().Split(';')[0].Trim();
        if (!AllowedAudioTypes.Contains(contentType))
        {
            logger.LogWarning("VoiceToRecordService: rejected audio with content-type={ContentType}", contentType);
            return (null, "unsupported_audio_format");
        }

        // Step 1: transcribe with Groq Whisper
        string transcript;
        try
        {
            transcript = await TranscribeAsync(audio, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "VoiceToRecordService: Whisper transcription failed");
            return (null, "transcription_failed");
        }

        if (string.IsNullOrWhiteSpace(transcript))
            return (null, "empty_transcript");

        logger.LogInformation("VoiceToRecordService: transcribed {Chars} chars", transcript.Length);

        // Step 2: parse with LLM
        ConsultationParseResult? parsed;
        try
        {
            parsed = await ParseWithLlmAsync(transcript, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "VoiceToRecordService: LLM parse failed");
            return (null, "parse_failed");
        }

        if (parsed is null)
            return (null, "parse_failed");

        var response = MapToResponse(transcript, parsed);
        return (response, null);
    }

    // ── Groq Whisper transcription ────────────────────────────────────────────

    private async Task<string> TranscribeAsync(IFormFile audio, CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient("GroqWhisper");

        using var ms = new MemoryStream();
        await audio.CopyToAsync(ms, ct);
        ms.Position = 0;

        // Determine file extension for Whisper — browsers send WebM, Groq needs a recognizable extension
        var ext = audio.ContentType.Contains("webm") ? ".webm"
            : audio.ContentType.Contains("ogg") ? ".ogg"
            : audio.ContentType.Contains("wav") ? ".wav"
            : audio.ContentType.Contains("mp4") ? ".mp4"
            : ".mp3";

        using var form = new MultipartFormDataContent();

        var fileContent = new StreamContent(ms);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse(audio.ContentType);
        form.Add(fileContent, "file", $"audio{ext}");
        form.Add(new StringContent("whisper-large-v3-turbo"), "model");
        form.Add(new StringContent("ro"), "language");
        form.Add(new StringContent("text"), "response_format");

        using var response = await client.PostAsync("audio/transcriptions", form, ct);
        response.EnsureSuccessStatusCode();

        return (await response.Content.ReadAsStringAsync(ct)).Trim();
    }

    // ── LLM parse ─────────────────────────────────────────────────────────────

    private async Task<ConsultationParseResult?> ParseWithLlmAsync(string transcript, CancellationToken ct)
    {
        var systemPrompt = LoadPrompt("ConsultationParsePrompt.v1.txt");
        var model = opts.Value.ModelName;

        var request = new LlmRequestBuilder(model)
            .WithSystemPrompt(systemPrompt)
            .WithUserMessage(transcript)
            .WithMaxTokens(2000)
            .WithJsonResponseFormat()
            .Build();

        var llmResponse = await llm.CompleteAsync(request, ct);
        var json = llmResponse.FirstContent;

        if (string.IsNullOrWhiteSpace(json))
            return null;

        try
        {
            return JsonSerializer.Deserialize<ConsultationParseResult>(json, JsonOpts);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "VoiceToRecordService: failed to deserialize LLM parse output: {Json}",
                json.Length > 500 ? json[..500] : json);
            return null;
        }
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static VoiceToMedicalRecordResponse MapToResponse(
        string transcript, ConsultationParseResult parsed)
    {
        VoiceVitalSigns? vitals = null;
        if (parsed.VitalSigns is { } vs &&
            (vs.BloodPressure ?? vs.HeartRate ?? vs.Temperature ??
             vs.RespiratoryRate ?? vs.OxygenSaturation ?? vs.Weight ?? vs.Height) is not null)
        {
            vitals = new VoiceVitalSigns
            {
                BloodPressure    = vs.BloodPressure,
                HeartRate        = vs.HeartRate,
                Temperature      = vs.Temperature,
                RespiratoryRate  = vs.RespiratoryRate,
                OxygenSaturation = vs.OxygenSaturation,
                Weight           = vs.Weight,
                Height           = vs.Height,
            };
        }

        return new VoiceToMedicalRecordResponse
        {
            Transcript         = transcript,
            ChiefComplaint     = NullIfEmpty(parsed.ChiefComplaint),
            Diagnosis          = NullIfEmpty(parsed.Diagnosis),
            IcdCode            = NullIfEmpty(parsed.IcdCode),
            SecondaryDiagnoses = NullIfEmpty(parsed.SecondaryDiagnoses),
            Symptoms           = NullIfEmpty(parsed.Symptoms),
            PhysicalExam       = NullIfEmpty(parsed.PhysicalExam),
            Treatment          = NullIfEmpty(parsed.Treatment),
            Procedures         = NullIfEmpty(parsed.Procedures),
            Urgency            = NullIfEmpty(parsed.Urgency),
            FollowUpIn         = NullIfEmpty(parsed.FollowUpIn),
            FollowUpType       = NullIfEmpty(parsed.FollowUpType),
            Referral           = NullIfEmpty(parsed.Referral),
            PatientEducation   = NullIfEmpty(parsed.PatientEducation),
            VitalSigns         = vitals,
            PrescribedDrugs    = parsed.PrescribedDrugs?
                .Where(d => !string.IsNullOrWhiteSpace(d.Name))
                .Select(d => new VoicePrescribedDrug
                {
                    Name         = d.Name,
                    GenericName  = NullIfEmpty(d.GenericName),
                    Dose         = NullIfEmpty(d.Dose),
                    Route        = NullIfEmpty(d.Route),
                    Frequency    = NullIfEmpty(d.Frequency),
                    Duration     = NullIfEmpty(d.Duration),
                    Quantity     = NullIfEmpty(d.Quantity),
                    Instructions = NullIfEmpty(d.Instructions),
                    Indication   = NullIfEmpty(d.Indication),
                })
                .ToList(),
        };
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    // ── Prompt loader (mirrors LabInsightGenerator pattern) ───────────────────

    private static string LoadPrompt(string resourceFileName)
    {
        var assembly = Assembly.Load("MedKit.AiInsights");
        var fullName = assembly.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith(resourceFileName, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException(
                $"Embedded prompt '{resourceFileName}' not found.");

        using var stream = assembly.GetManifestResourceStream(fullName)!;
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    // ── Internal deserialization model ────────────────────────────────────────

    private sealed class ConsultationParseResult
    {
        [JsonPropertyName("chiefComplaint")]    public string? ChiefComplaint { get; set; }
        [JsonPropertyName("diagnosis")]         public string? Diagnosis { get; set; }
        [JsonPropertyName("icdCode")]           public string? IcdCode { get; set; }
        [JsonPropertyName("secondaryDiagnoses")]public string? SecondaryDiagnoses { get; set; }
        [JsonPropertyName("symptoms")]          public string? Symptoms { get; set; }
        [JsonPropertyName("physicalExam")]      public string? PhysicalExam { get; set; }
        [JsonPropertyName("treatment")]         public string? Treatment { get; set; }
        [JsonPropertyName("procedures")]        public string? Procedures { get; set; }
        [JsonPropertyName("urgency")]           public string? Urgency { get; set; }
        [JsonPropertyName("followUpIn")]        public string? FollowUpIn { get; set; }
        [JsonPropertyName("followUpType")]      public string? FollowUpType { get; set; }
        [JsonPropertyName("referral")]          public string? Referral { get; set; }
        [JsonPropertyName("patientEducation")]  public string? PatientEducation { get; set; }
        [JsonPropertyName("vitalSigns")]        public VitalSignsRaw? VitalSigns { get; set; }
        [JsonPropertyName("prescribedDrugs")]   public List<DrugRaw>? PrescribedDrugs { get; set; }
    }

    private sealed class VitalSignsRaw
    {
        [JsonPropertyName("bloodPressure")]    public string? BloodPressure { get; set; }
        [JsonPropertyName("heartRate")]        public string? HeartRate { get; set; }
        [JsonPropertyName("temperature")]      public string? Temperature { get; set; }
        [JsonPropertyName("respiratoryRate")]  public string? RespiratoryRate { get; set; }
        [JsonPropertyName("oxygenSaturation")] public string? OxygenSaturation { get; set; }
        [JsonPropertyName("weight")]           public string? Weight { get; set; }
        [JsonPropertyName("height")]           public string? Height { get; set; }
    }

    private sealed class DrugRaw
    {
        [JsonPropertyName("name")]         public string? Name { get; set; }
        [JsonPropertyName("genericName")]  public string? GenericName { get; set; }
        [JsonPropertyName("dose")]         public string? Dose { get; set; }
        [JsonPropertyName("route")]        public string? Route { get; set; }
        [JsonPropertyName("frequency")]    public string? Frequency { get; set; }
        [JsonPropertyName("duration")]     public string? Duration { get; set; }
        [JsonPropertyName("quantity")]     public string? Quantity { get; set; }
        [JsonPropertyName("instructions")] public string? Instructions { get; set; }
        [JsonPropertyName("indication")]   public string? Indication { get; set; }
    }
}
