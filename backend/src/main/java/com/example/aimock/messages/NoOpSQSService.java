package com.example.aimock.messages;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@Primary
@ConditionalOnProperty(name = "app.sqs.enabled", havingValue = "false", matchIfMissing = true)
@Slf4j
public class NoOpSQSService implements SQSService {

    @Override
    public void enqueueMessageJob(UUID interviewerMessageId, UUID sessionId, String userContent) {
        log.debug("No-op SQS: would enqueue job for interviewerMessageId={}, sessionId={}",
                interviewerMessageId, sessionId);
    }
}
