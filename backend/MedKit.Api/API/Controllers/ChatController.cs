using System.Security.Claims;
using MedKit.Api.API.DTOs;
using MedKit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedKit.Api.API.Controllers;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController(ChatService chatService) : ControllerBase
{
    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession(
        [FromBody] CreateChatSessionRequest request,
        CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var session = await chatService.CreateSessionAsync(request.PatientId, userId, ct);
        return CreatedAtAction(nameof(GetMessages), new { id = session.Id }, session);
    }

    [HttpPost("sessions/{id:guid}/messages")]
    public async Task<IActionResult> SendMessage(
        Guid id,
        [FromBody] SendChatMessageRequest request,
        CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { error = "Message content cannot be empty." });

        var (dto, error) = await chatService.SendMessageAsync(id, request.Content, userId, ct);

        return error switch
        {
            "session_not_found" => NotFound(new { error = "Chat session not found." }),
            "forbidden"         => Forbid(),
            "empty_content"     => BadRequest(new { error = "Message content cannot be empty." }),
            "agent_error"       => StatusCode(502, new { error = "AI agent failed. Check server logs." }),
            null when dto is not null => Ok(dto),
            _ => StatusCode(500, new { error = "Failed to send message. Please try again." }),
        };
    }

    [HttpGet("sessions/{id:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid id, CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var (messages, error) = await chatService.GetMessagesAsync(id, userId, ct);

        return error switch
        {
            "session_not_found" => NotFound(new { error = "Chat session not found." }),
            "forbidden"         => Forbid(),
            null when messages is not null => Ok(messages),
            _ => StatusCode(500, new { error = "Failed to retrieve messages." }),
        };
    }
}
