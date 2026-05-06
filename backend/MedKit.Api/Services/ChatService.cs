using MedKit.AiInsights.Abstractions;
using MedKit.AiInsights.Generators;
using MedKit.AiInsights.Models;
using MedKit.Api.API.DTOs;
using MedKit.Api.Models;
using MedKit.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MedKit.Api.Services;

public class ChatService(
    AppDbContext db,
    ChatAgent agent,
    IPatientDataProvider dataProvider,
    ILogger<ChatService> logger)
{
    private const int MaxHistoryMessages = 20;

    public async Task<ChatSessionDto> CreateSessionAsync(
        Guid? patientId, Guid initiatedByUserId, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var session = new ChatSessionEntity
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            InitiatedByUserId = initiatedByUserId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.ChatSessions.Add(session);
        await db.SaveChangesAsync(ct);

        return ToDto(session);
    }

    public async Task<(ChatMessageDto? Dto, string? Error)> SendMessageAsync(
        Guid sessionId,
        string content,
        Guid requestingUserId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(content))
            return (null, "empty_content");

        var session = await db.ChatSessions.FindAsync([sessionId], ct);
        if (session is null)
            return (null, "session_not_found");

        // Patients can only use their own sessions
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == requestingUserId, ct);
        if (user?.Role == "patient" && session.InitiatedByUserId != requestingUserId)
            return (null, "forbidden");

        var now = DateTimeOffset.UtcNow;

        var userMessage = new ChatMessageEntity
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            Role = "user",
            Content = content,
            Timestamp = now,
        };
        db.ChatMessages.Add(userMessage);
        await db.SaveChangesAsync(ct);

        // Load recent history to pass to agent (most recent MaxHistoryMessages messages)
        var historyRaw = await db.ChatMessages
            .AsNoTracking()
            .Where(m => m.SessionId == sessionId)
            .OrderByDescending(m => m.Timestamp)
            .Take(MaxHistoryMessages)
            .ToListAsync(ct);

        var history = historyRaw
            .OrderBy(m => m.Timestamp)
            .Select(m => new LlmMessage(m.Role, m.Content))
            .ToList();

        var patientId = session.PatientId ?? Guid.Empty;
        bool isDoctor = user?.Role != "patient";

        string reply;
        try
        {
            reply = await agent.SendMessageAsync(history, patientId, dataProvider, isDoctor, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "ChatAgent failed for session {SessionId}", sessionId);
            return (null, "agent_error");
        }

        var assistantMessage = new ChatMessageEntity
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            Role = "assistant",
            Content = reply,
            Timestamp = DateTimeOffset.UtcNow,
        };
        db.ChatMessages.Add(assistantMessage);

        session.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return (ToMessageDto(assistantMessage), null);
    }

    public async Task<(IList<ChatMessageDto>? Messages, string? Error)> GetMessagesAsync(
        Guid sessionId,
        Guid requestingUserId,
        CancellationToken ct = default)
    {
        var session = await db.ChatSessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == sessionId, ct);
        if (session is null)
            return (null, "session_not_found");

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == requestingUserId, ct);
        if (user?.Role == "patient" && session.InitiatedByUserId != requestingUserId)
            return (null, "forbidden");

        var rawMessages = await db.ChatMessages
            .AsNoTracking()
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.Timestamp)
            .ToListAsync(ct);

        var messages = rawMessages.Select(ToMessageDto).ToList();

        return (messages, null);
    }

    private static ChatSessionDto ToDto(ChatSessionEntity e) => new()
    {
        Id = e.Id.ToString(),
        PatientId = e.PatientId?.ToString(),
        CreatedAt = e.CreatedAt.ToString("o"),
    };

    private static ChatMessageDto ToMessageDto(ChatMessageEntity e) => new()
    {
        Id = e.Id.ToString(),
        Role = e.Role,
        Content = e.Content,
        Timestamp = e.Timestamp.ToString("o"),
    };
}
