package com.example.aimock.messages;

import com.example.aimock.ai.dto.AIProcessingRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import java.util.UUID;

@Service
@ConditionalOnProperty(name = "app.sqs.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class RealSQSService implements SQSService {

    private final SqsClient sqsClient;
    private final ObjectMapper objectMapper;

    @Value("${app.sqs.queue-url}")
    private String queueUrl;

    @Override
    public void enqueueMessageJob(UUID interviewerMessageId, UUID sessionId, String userContent) {
        try {
            // Keep message format compatible with AIProcessingRequest
            String body = objectMapper.writeValueAsString(new AIProcessingRequest(
                    interviewerMessageId,
                    sessionId,
                    userContent,
                    0
            ));

            boolean fifo = queueUrl != null && queueUrl.endsWith(".fifo");

            SendMessageRequest.Builder req = SendMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .messageBody(body);

            // FIFO queues REQUIRE MessageGroupId, and require MessageDeduplicationId unless
            // content-based deduplication is enabled (yours is disabled).
            if (fifo) {
                req = req.messageGroupId(sessionId.toString())
                        .messageDeduplicationId(interviewerMessageId.toString());
            }

            sqsClient.sendMessage(req.build());

            log.info("Enqueued AI job to SQS: interviewerMessageId={}, sessionId={}, fifo={}",
                    interviewerMessageId, sessionId, fifo);
        } catch (Exception e) {
            throw new RuntimeException("Failed to enqueue SQS message", e);
        }
    }
}
