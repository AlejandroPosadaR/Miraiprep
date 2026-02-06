package com.example.aimock.messages;

import com.example.aimock.auth.user.User;
import com.example.aimock.auth.user.UserRepository;
import com.example.aimock.exception.MessageLimitExceededException;
import com.example.aimock.exception.ResourceNotFoundException;
import com.example.aimock.messages.dto.MessageCreationResult;
import com.example.aimock.messages.events.AiJobRequestedEvent;
import com.example.aimock.messages.model.Message;
import com.example.aimock.session.InterviewSession;
import com.example.aimock.session.InterviewSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for message operations with idempotent, ordered message append.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final InterviewSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final SQSService sqsService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<Message> getMessages(UUID sessionId, Long cursorSeq, Integer limit) {
        List<Message> all = messageRepository.findBySessionIdOrderBySeqAsc(sessionId);
        return all.stream()
                .filter(m -> cursorSeq == null || m.getSeq() > cursorSeq)
                .limit(limit != null && limit > 0 ? limit : Integer.MAX_VALUE)
                .collect(Collectors.toList());
    }

    /**
     * Creates a user message and enqueues AI processing.
     */
    @Transactional
    public MessageCreationResult createUserMessageAndEnqueue(
            UUID sessionId, 
            UUID userId, 
            String content,
            String idempotencyKey) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        
        if (!user.hasMessagesRemaining()) {
            log.warn("Message limit exceeded for user: userId={}, tier={}, count={}, limit={}",
                    userId, user.getTier(), user.getMessageCount(), user.getMessageLimit());
            throw new MessageLimitExceededException(
                    user.getMessageLimit(), 
                    user.getMessageCount(), 
                    user.getTier()
            );
        }
        
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<MessageCreationResult> existing = checkIdempotency(sessionId, idempotencyKey);
            if (existing.isPresent()) {
                log.info("Idempotency hit (fast path): sessionId={}, idempotencyKey={}", 
                        sessionId, idempotencyKey);
                return existing.get();
            }
        }
        
        InterviewSession session = sessionRepository
            .findByIdAndUserIdForUpdate(sessionId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId));
        
        log.debug("Acquired lock on session: sessionId={}", sessionId);
        
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<MessageCreationResult> existing = checkIdempotency(sessionId, idempotencyKey);
            if (existing.isPresent()) {
                log.info("Idempotency hit (under lock): sessionId={}, idempotencyKey={}", 
                        sessionId, idempotencyKey);
                return existing.get();
            }
        }
        
        long userSeq = session.allocateSeq();
        long interviewerSeq = session.allocateSeq();
        
        log.debug("Allocated sequences: userSeq={}, interviewerSeq={}", userSeq, interviewerSeq);
        
        Message userMessage = Message.user(content, sessionId, userSeq, idempotencyKey);
        userMessage = messageRepository.save(userMessage);
        
        Message interviewerPlaceholder = Message.interviewer("", sessionId, interviewerSeq);
        interviewerPlaceholder = messageRepository.save(interviewerPlaceholder);
        
        sessionRepository.save(session);
        
        user.incrementMessageCount();
        userRepository.save(user);
        
        log.info("Created messages: userMessageId={}, interviewerMessageId={}, sessionId={}, remainingMessages={}", 
                userMessage.getId(), interviewerPlaceholder.getId(), sessionId, user.getRemainingMessages());
        
        eventPublisher.publishEvent(new AiJobRequestedEvent(
                interviewerPlaceholder.getId(),
                sessionId,
                content
        ));
        
        return new MessageCreationResult(userMessage.getId(), interviewerPlaceholder.getId());
    }
    
    /**
     * Check if a message with this idempotency key already exists.
     */
    private Optional<MessageCreationResult> checkIdempotency(UUID sessionId, String idempotencyKey) {
        return messageRepository.findBySessionIdAndIdempotencyKey(sessionId, idempotencyKey)
                .map(userMessage -> {
                    // Find the corresponding interviewer message (next seq)
                    UUID interviewerMessageId = messageRepository
                            .findInterviewerMessageAfterSeq(sessionId, userMessage.getSeq())
                            .map(Message::getId)
                            .orElse(null);
                    
                    return new MessageCreationResult(userMessage.getId(), interviewerMessageId);
                });
    }
}
