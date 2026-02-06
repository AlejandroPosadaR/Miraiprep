package com.example.aimock.websocket.dto;

import com.example.aimock.messages.model.MessageStatus;

import java.util.UUID;

public record SessionTopicEvent(
        String type,
        UUID sessionId,
        UUID userMessageId,
        UUID interviewerMessageId,
        String delta,
        String content,
        MessageStatus messageStatus,
        String error,
        // Message limit fields
        Integer messageLimit,
        Integer messageCount,
        String tier
) {
    public static SessionTopicEvent accepted(UUID sessionId, UUID userMessageId, UUID interviewerMessageId) {
        return new SessionTopicEvent("accepted", sessionId, userMessageId, interviewerMessageId, null, null, null, null, null, null, null);
    }

    public static SessionTopicEvent aiDelta(UUID sessionId, UUID interviewerMessageId, String delta) {
        return new SessionTopicEvent("ai_delta", sessionId, null, interviewerMessageId, delta, null, MessageStatus.STREAMING, null, null, null, null);
    }

    public static SessionTopicEvent aiComplete(UUID sessionId, UUID interviewerMessageId, String content) {
        return new SessionTopicEvent("ai_complete", sessionId, null, interviewerMessageId, null, content, MessageStatus.COMPLETED, null, null, null, null);
    }

    public static SessionTopicEvent aiFailed(UUID sessionId, UUID interviewerMessageId, String error) {
        return new SessionTopicEvent("ai_failed", sessionId, null, interviewerMessageId, null, null, MessageStatus.FAILED, error, null, null, null);
    }

    public static SessionTopicEvent messageLimitExceeded(UUID sessionId, int messageLimit, int messageCount, String tier) {
        return new SessionTopicEvent("message_limit_exceeded", sessionId, null, null, null, null, null, 
                String.format("Message limit exceeded. You have used %d of %d messages on the %s tier.", messageCount, messageLimit, tier),
                messageLimit, messageCount, tier);
    }
}

