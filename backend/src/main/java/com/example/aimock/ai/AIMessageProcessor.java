package com.example.aimock.ai;

import com.example.aimock.ai.dto.AIProcessingResult;
import com.example.aimock.messages.MessageRepository;
import com.example.aimock.messages.model.Message;
import com.example.aimock.messages.model.MessageRole;
import com.example.aimock.messages.model.MessageStatus;
import com.example.aimock.session.InterviewSession;
import com.example.aimock.session.InterviewSessionRepository;
import com.example.aimock.websocket.SessionTopicPublisher;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;

/**
 * Processes AI messages with short transaction boundaries.
 * Uses TransactionTemplate to avoid holding DB connections during AI streaming.
 */
@Service
@Slf4j
public class AIMessageProcessor {

    private final AIChatService aiChatService;
    private final MessageRepository messageRepository;
    private final InterviewSessionRepository sessionRepository;
    private final SessionTopicPublisher topicPublisher;
    private final Timer aiResponseTimer;
    private final Timer aiTimeToFirstToken;
    private final Counter aiProcessingSuccess;
    private final Counter aiProcessingFailure;
    private final TransactionTemplate transactionTemplate;

    @Value("${app.ai.streaming.enabled:true}")
    private boolean streamingEnabled;

    // Create TransactionTemplate from PlatformTransactionManager (auto-configured by Spring Boot)
    public AIMessageProcessor(AIChatService aiChatService, MessageRepository messageRepository,
                             InterviewSessionRepository sessionRepository, SessionTopicPublisher topicPublisher,
                             Timer aiResponseTimer, Timer aiTimeToFirstToken, Counter aiProcessingSuccess,
                             Counter aiProcessingFailure, PlatformTransactionManager transactionManager) {
        this.aiChatService = aiChatService;
        this.messageRepository = messageRepository;
        this.sessionRepository = sessionRepository;
        this.topicPublisher = topicPublisher;
        this.aiResponseTimer = aiResponseTimer;
        this.aiTimeToFirstToken = aiTimeToFirstToken;
        this.aiProcessingSuccess = aiProcessingSuccess;
        this.aiProcessingFailure = aiProcessingFailure;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public AIProcessingResult processMessage(
            UUID interviewerMessageId,
            UUID sessionId,
            String userContent) {
        
        log.info("Processing AI message: interviewerMessageId={}, sessionId={}", 
                interviewerMessageId, sessionId);

        try {
            // Phase 1: Short transaction - mark as STREAMING
            StreamingContext ctx = prepareForStreaming(interviewerMessageId, sessionId);
            
            // Phase 2: NO TRANSACTION - stream tokens (can take seconds/minutes)
            String aiResponse = streamAiResponse(ctx, userContent);
            
            // Phase 3: Short transaction - save final result
            saveSuccessResult(interviewerMessageId, sessionId, aiResponse);
            
            aiProcessingSuccess.increment();
            return new AIProcessingResult(interviewerMessageId, sessionId, aiResponse, 
                    AIProcessingResult.Status.SUCCESS, null);

        } catch (Exception e) {
            log.error("Failed to process AI message: interviewerMessageId={}", interviewerMessageId, e);
            aiProcessingFailure.increment();
            markAsFailed(interviewerMessageId, sessionId, e.getMessage());
            return new AIProcessingResult(interviewerMessageId, sessionId, null, 
                    AIProcessingResult.Status.FAILED, e.getMessage());
        }
    }

    private StreamingContext prepareForStreaming(UUID interviewerMessageId, UUID sessionId) {
        return transactionTemplate.execute(status -> {
            Message placeholder = messageRepository.findById(interviewerMessageId)
                    .orElseThrow(() -> new RuntimeException("Placeholder not found: " + interviewerMessageId));
            
            if (placeholder.getRole() != MessageRole.INTERVIEWER) {
                throw new RuntimeException("Not an INTERVIEWER placeholder: " + interviewerMessageId);
            }

            InterviewSession session = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

            List<Message> history = messageRepository.findBySessionIdOrderBySeqAsc(sessionId);

            placeholder.setMessageStatus(MessageStatus.STREAMING);
            messageRepository.save(placeholder);
            topicPublisher.aiDelta(sessionId, interviewerMessageId, "");

            return new StreamingContext(sessionId, interviewerMessageId, session.getInterviewType(),
                    session.getExperienceYears() != null ? session.getExperienceYears() : 2,
                    session.getJobDescription(), history);
        });
    }

    private void saveSuccessResult(UUID interviewerMessageId, UUID sessionId, String aiResponse) {
        transactionTemplate.executeWithoutResult(status -> {
            Message msg = messageRepository.findById(interviewerMessageId)
                    .orElseThrow(() -> new RuntimeException("Message not found: " + interviewerMessageId));
            msg.setContent(aiResponse);
            msg.setMessageStatus(MessageStatus.COMPLETED);
            messageRepository.save(msg);
            topicPublisher.aiComplete(sessionId, interviewerMessageId, aiResponse);
            log.info("Saved the response={}", aiResponse);
        });
    }

    private void markAsFailed(UUID interviewerMessageId, UUID sessionId, String errorMessage) {
        transactionTemplate.executeWithoutResult(status -> {
            try {
                Message msg = messageRepository.findById(interviewerMessageId).orElse(null);
                if (msg != null) {
                    msg.setMessageStatus(MessageStatus.FAILED);
                    messageRepository.save(msg);
                }
                topicPublisher.aiFailed(sessionId, interviewerMessageId, errorMessage);
            } catch (Exception e) {
                log.error("Failed to mark message as failed: interviewerMessageId={}", interviewerMessageId, e);
            }
        });
    }

    private String streamAiResponse(StreamingContext ctx, String userContent) throws Exception {
        return aiResponseTimer.recordCallable(() -> {
            if (streamingEnabled) {
                return streamWithTokens(ctx, userContent);
            } else {
                return generateNonStreaming(ctx, userContent);
            }
        });
    }

    private String streamWithTokens(StreamingContext ctx, String userContent) {
        StringBuilder sb = new StringBuilder();
        
        // Measure TTFT from just before OpenAI API call (excludes DB queries and prompt building)
        long aiCallStartTime = System.currentTimeMillis();
        Flux<String> flux = aiChatService.streamResponse(ctx.interviewType(), ctx.history(),
                userContent, ctx.experienceYears(), ctx.jobDescription());

        final boolean[] firstTokenSent = {false};
        flux.doOnNext(delta -> {
            if (delta == null || delta.isEmpty()) return;
            if (!firstTokenSent[0]) {
                // Record TTFT: time from OpenAI API call to first token
                long ttft = System.currentTimeMillis() - aiCallStartTime;
                aiTimeToFirstToken.record(ttft, java.util.concurrent.TimeUnit.MILLISECONDS);
                firstTokenSent[0] = true;
                log.debug("TTFT: {}ms for sessionId={}", ttft, ctx.sessionId());
            }
            sb.append(delta);
            topicPublisher.aiDelta(ctx.sessionId(), ctx.interviewerMessageId(), delta);
        }).blockLast();
        return sb.toString();
    }

    private String generateNonStreaming(StreamingContext ctx, String userContent) {
        // Measure TTFT from just before OpenAI API call
        long aiCallStartTime = System.currentTimeMillis();
        String response = aiChatService.generateResponse(ctx.interviewType(), ctx.history(),
                userContent, ctx.experienceYears(), ctx.jobDescription());
        // For non-streaming, TTFT = total response time
        long ttft = System.currentTimeMillis() - aiCallStartTime;
        aiTimeToFirstToken.record(ttft, java.util.concurrent.TimeUnit.MILLISECONDS);
        log.debug("TTFT (non-streaming): {}ms for sessionId={}", ttft, ctx.sessionId());
        return response;
    }

    public record StreamingContext(
            UUID sessionId,
            UUID interviewerMessageId,
            String interviewType,
            int experienceYears,
            String jobDescription,
            List<Message> history
    ) {}
}
