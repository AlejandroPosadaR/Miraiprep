package com.example.aimock.messages.events;

import java.util.UUID;

/**
 * Published inside the DB transaction when an AI job should be enqueued.
 * Handled AFTER_COMMIT to avoid racing the DB commit.
 */
public record AiJobRequestedEvent(
        UUID interviewerMessageId,
        UUID sessionId,
        String userContent
) {}

