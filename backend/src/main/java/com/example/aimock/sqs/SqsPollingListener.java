package com.example.aimock.sqs;

import com.example.aimock.ai.consumer.SQSMessageConsumer;
import com.example.aimock.ai.dto.AIProcessingResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;

import java.util.List;

@Component
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.sqs.enabled", havingValue = "true")
public class SqsPollingListener {

    private final SqsClient sqsClient;
    private final SQSMessageConsumer consumer;

    @Value("${app.sqs.queue-url}")
    private String queueUrl;

    @Value("${app.sqs.max-messages:10}")
    private int maxMessages;

    @Value("${app.sqs.wait-time-seconds:20}")
    private int waitTimeSeconds;

    @Value("${app.sqs.visibility-timeout-seconds:60}")
    private int visibilityTimeoutSeconds;

    private volatile boolean credsErrorLogged = false;

    @Scheduled(fixedDelayString = "${app.sqs.poll-delay-ms:1000}")
    public void poll() {
        ReceiveMessageRequest req = ReceiveMessageRequest.builder()
                .queueUrl(queueUrl)
                .maxNumberOfMessages(maxMessages)
                .waitTimeSeconds(waitTimeSeconds)
                .visibilityTimeout(visibilityTimeoutSeconds)
                .build();

        List<Message> messages;
        try {
            messages = sqsClient.receiveMessage(req).messages();
        } catch (SdkClientException e) {
            // Typically missing AWS credentials / region / endpoint.
            if (!credsErrorLogged) {
                credsErrorLogged = true;
                log.error("SQS polling failed. Most likely missing AWS credentials in the container. " +
                                "Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY (and optionally AWS_SESSION_TOKEN), " +
                                "or disable SQS with app.sqs.enabled=false.",
                        e);
            }
            return;
        }
        if (messages == null || messages.isEmpty()) return;

        for (Message m : messages) {
            try {
                AIProcessingResult result = consumer.processMessage(m.body());
                if (result.getStatus() == AIProcessingResult.Status.SUCCESS) {
                    sqsClient.deleteMessage(DeleteMessageRequest.builder()
                            .queueUrl(queueUrl)
                            .receiptHandle(m.receiptHandle())
                            .build());
                    log.debug("Deleted SQS message id={} after SUCCESS", m.messageId());
                } else {
                    // Let SQS redrive policy / retries handle it
                    log.warn("Not deleting SQS message id={} (status={})", m.messageId(), result.getStatus());
                }
            } catch (Exception e) {
                // Do not delete so SQS can retry / eventually dead-letter
                log.error("Error processing SQS message id={}. Not deleting.", m.messageId(), e);
            }
        }
    }
}

