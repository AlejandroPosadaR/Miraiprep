package com.example.aimock.ai;

import com.example.aimock.ai.dto.AIProcessingRequest;
import com.example.aimock.ai.dto.AIProcessingResult;
import com.example.aimock.messages.MessageRepository;
import com.example.aimock.messages.model.Message;
import com.example.aimock.messages.model.MessageStatus;
import com.example.aimock.session.InterviewSession;
import com.example.aimock.session.InterviewSessionRepository;
import com.example.aimock.websocket.SessionTopicPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;

/**
 * Main service for processing AI interview messages.
 * Handles the complete flow: context retrieval, AI generation, and message updates.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AIMessageProcessor {

    private final AIChatService aiChatService;
    private final MessageRepository messageRepository;
    private final InterviewSessionRepository sessionRepository;
    private final SessionTopicPublisher topicPublisher;

    @Value("${app.ai.streaming.enabled:true}")
    private boolean streamingEnabled;

    /**
     * Processes an AI message job.
     * 
     * @param interviewerMessageId The placeholder message ID to update with AI response
     * @param sessionId The interview session ID
     * @param userContent The user's message content that triggered this AI response
     * @return Processing result with status and generated content
     */
    public AIProcessingResult processMessage(
            UUID interviewerMessageId,
            UUID sessionId,
            String userContent) {
        
        log.info("Processing AI message: interviewerMessageId={}, sessionId={}", 
                interviewerMessageId, sessionId);

        // 1. Load the placeholder message
        Message placeholder = messageRepository.findById(interviewerMessageId)
                .orElseThrow(() -> new RuntimeException(
                        "Placeholder message not found: " + interviewerMessageId));

        if (placeholder.getRole() != com.example.aimock.messages.model.MessageRole.INTERVIEWER) {
            throw new RuntimeException("Message is not an INTERVIEWER placeholder: " + interviewerMessageId);
        }

        // 2. Mark as in-progress (this project uses STREAMING as the "in progress" state)
        placeholder.setMessageStatus(MessageStatus.STREAMING);
        messageRepository.save(placeholder);
        topicPublisher.aiDelta(sessionId, interviewerMessageId, ""); // nudge UI that AI started

        try {
            // 3. Get conversation context (previous messages)
            List<Message> conversationHistory = messageRepository
                    .findBySessionIdOrderBySeqAsc(sessionId);

            // 4. Get session metadata for context
            InterviewSession session = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

            String aiResponse;

            if (streamingEnabled) {
                StringBuilder sb = new StringBuilder();
                Flux<String> flux = aiChatService.streamResponse(
                        session.getInterviewType(),
                        conversationHistory,
                        userContent
                );

                flux.doOnNext(delta -> {
                            if (delta == null || delta.isEmpty()) return;
                            sb.append(delta);
                            topicPublisher.aiDelta(sessionId, interviewerMessageId, delta);
                        })
                        .blockLast();

                aiResponse = sb.toString();
            } else {
                // 5. Generate AI response (single shot)
                aiResponse = aiChatService.generateResponse(
                        session.getInterviewType(),
                        conversationHistory,
                        userContent
                );
            }

            // 6. Update placeholder with AI response
            Message toUpdate = messageRepository.findById(interviewerMessageId)
                    .orElseThrow(() -> new RuntimeException(
                            "Placeholder message not found (post-stream): " + interviewerMessageId));
            toUpdate.setContent(aiResponse);
            toUpdate.setMessageStatus(MessageStatus.COMPLETED);
            messageRepository.save(toUpdate);
            topicPublisher.aiComplete(sessionId, interviewerMessageId, aiResponse);

            log.info("AI message processed successfully: interviewerMessageId={}, responseLength={}",
                    interviewerMessageId, aiResponse.length());

            return new AIProcessingResult(
                    interviewerMessageId,
                    sessionId,
                    aiResponse,
                    AIProcessingResult.Status.SUCCESS,
                    null
            );

        } catch (Exception e) {
            log.error("Failed to process AI message: interviewerMessageId={}", 
                    interviewerMessageId, e);
            
            // Mark as failed
            placeholder.setMessageStatus(MessageStatus.FAILED);
            messageRepository.save(placeholder);
            topicPublisher.aiFailed(sessionId, interviewerMessageId, e.getMessage());

            return new AIProcessingResult(
                    interviewerMessageId,
                    sessionId,
                    null,
                    AIProcessingResult.Status.FAILED,
                    e.getMessage()
            );
        }
    }
}
