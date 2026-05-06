namespace MedKit.Api.API.DTOs;

public class ChatSessionDto
{
    public string Id { get; init; } = "";
    public string? PatientId { get; init; }
    public string CreatedAt { get; init; } = "";
}

public class ChatMessageDto
{
    public string Id { get; init; } = "";
    public string Role { get; init; } = "";
    public string Content { get; init; } = "";
    public string Timestamp { get; init; } = "";
}

public class CreateChatSessionRequest
{
    public Guid? PatientId { get; init; }
}

public class SendChatMessageRequest
{
    public string Content { get; init; } = "";
}
