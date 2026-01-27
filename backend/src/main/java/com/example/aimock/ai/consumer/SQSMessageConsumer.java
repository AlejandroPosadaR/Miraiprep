package com.example.aimock.ai.consumer;

import com.example.aimock.ai.AIMessageProcessor;
import com.example.aimock.ai.dto.AIProcessingRequest;
import com.example.aimock.ai.dto.AIProcessingResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SQSMessageConsumer {

    private final AIMessageProcessor aiMessageProcessor;
    private final ObjectMapper objectMapper;

    public AIProcessingResult processMessage(String messageBody) throws Exception {
        log.info("Received SQS message (len={} chars)", messageBody != null ? messageBody.length() : 0);

        AIProcessingRequest request = objectMapper.readValue(messageBody, AIProcessingRequest.class);

        AIProcessingResult result = aiMessageProcessor.processMessage(
                request.getInterviewerMessageId(),
                request.getSessionId(),
                request.getUserContent()
        );

        if (result.getStatus() == AIProcessingResult.Status.SUCCESS) {
            log.info("AI message processed successfully: interviewerMessageId={}",
                    result.getInterviewerMessageId());
        } else {
            log.error("AI message processing failed: interviewerMessageId={}, error={}",
                    result.getInterviewerMessageId(), result.getErrorMessage());
        }

        return result;
    }

}
