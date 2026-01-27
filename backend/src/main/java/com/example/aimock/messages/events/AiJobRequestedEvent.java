package com.example.aimock.messages.events;

import java.util.UUID;

public record AiJobRequestedEvent(
        UUID interviewerMessageId,
        UUID sessionId,
        String userContent
) {}

