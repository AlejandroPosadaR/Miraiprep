package com.example.aimock.messages;

import java.util.UUID;

public interface SQSService {

    void enqueueMessageJob(UUID interviewerMessageId, UUID sessionId, String userContent);
}
