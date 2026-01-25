package com.example.aimock.messages;

import java.util.UUID;

/**
 * SQS integration for enqueueing AI message jobs.
 * Implement with real AWS SQS when available; use NoOpSQSService for local dev.
 */
public interface SQSService {

    void enqueueMessageJob(UUID interviewerMessageId, UUID sessionId, String userContent);
}
