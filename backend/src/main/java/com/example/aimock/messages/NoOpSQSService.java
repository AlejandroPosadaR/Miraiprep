package com.example.aimock.messages;

import com.example.aimock.ai.AIMessageProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * No-op SQS implementation that processes AI messages directly (synchronously in async thread).
 * Used when SQS is disabled (local development).
 * 
 * Note: No @Transactional here - AIMessageProcessor manages its own short transactions.
 */
@Service
@Primary
@ConditionalOnProperty(name = "app.sqs.enabled", havingValue = "false", matchIfMissing = true)
@Slf4j
@RequiredArgsConstructor
public class NoOpSQSService implements SQSService {

    private final AIMessageProcessor aiMessageProcessor;

    @Override
    @Async
    public void enqueueMessageJob(UUID interviewerMessageId, UUID sessionId, String userContent) {
        log.info("SQS disabled: processing AI message directly. interviewerMessageId={}, sessionId={}",
                interviewerMessageId, sessionId);
        try {
            aiMessageProcessor.processMessage(interviewerMessageId, sessionId, userContent);
        } catch (Exception e) {
            log.error("Error processing AI message directly (SQS disabled): interviewerMessageId={}, sessionId={}",
                    interviewerMessageId, sessionId, e);
        }
    }
}
