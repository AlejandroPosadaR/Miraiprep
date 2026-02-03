package com.example.aimock.messages;

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
 * 
 * <h3>How Idempotency Works</h3>
 * <pre>
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    createUserMessageAndEnqueue()                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. FAST PATH: Check idempotency (no lock)                              │
 * │    └─ If message exists → return existing IDs immediately              │
 * │                                                                         │
 * │ 2. SLOW PATH: Acquire pessimistic lock on session row                  │
 * │    └─ SELECT ... FOR UPDATE on interview_sessions                      │
 * │    └─ This BLOCKS concurrent requests for same session                 │
 * │                                                                         │
 * │ 3. DOUBLE-CHECK: Re-verify idempotency under lock                      │
 * │    └─ Another request may have created it while we waited              │
 * │                                                                         │
 * │ 4. ALLOCATE: Get next sequence numbers atomically                      │
 * │    └─ userSeq = session.allocateSeq()     (e.g., 5)                    │
 * │    └─ interviewerSeq = session.allocateSeq() (e.g., 6)                 │
 * │                                                                         │
 * │ 5. INSERT: Create messages with assigned sequences                      │
 * │    └─ USER message (seq=5, idempotencyKey="abc123")                    │
 * │    └─ INTERVIEWER placeholder (seq=6)                                  │
 * │                                                                         │
 * │ 6. COMMIT: Release lock, trigger AI job                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 * </pre>
 * 
 * <h3>Concurrency Guarantees</h3>
 * <ul>
 *   <li>Messages are always in correct order (monotonic seq per session)</li>
 *   <li>Duplicate requests return existing message (idempotency key)</li>
 *   <li>No lost messages under concurrent requests</li>
 *   <li>No duplicate AI jobs for the same user message</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final InterviewSessionRepository sessionRepository;
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
     * Creates a user message and enqueues AI processing, with idempotency guarantees.
     * 
     * @param sessionId       The interview session ID
     * @param userId          The user ID (for authorization)
     * @param content         The message content
     * @param idempotencyKey  Client-provided key for deduplication (should be UUID v4)
     * @return MessageCreationResult containing user and interviewer message IDs
     * 
     * @throws ResourceNotFoundException if session not found or doesn't belong to user
     */
    @Transactional
    public MessageCreationResult createUserMessageAndEnqueue(
            UUID sessionId, 
            UUID userId, 
            String content,
            String idempotencyKey) {
        
        // ═══════════════════════════════════════════════════════════════════
        // STEP 1: FAST PATH - Check for existing message without lock
        // ═══════════════════════════════════════════════════════════════════
        // This avoids acquiring a lock for retry requests (common case)
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<MessageCreationResult> existing = checkIdempotency(sessionId, idempotencyKey);
            if (existing.isPresent()) {
                log.info("Idempotency hit (fast path): sessionId={}, idempotencyKey={}", 
                        sessionId, idempotencyKey);
                return existing.get();
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // STEP 2: ACQUIRE PESSIMISTIC LOCK on session row
        // ═══════════════════════════════════════════════════════════════════
        // SELECT ... FOR UPDATE locks the row until transaction commits.
        // Other requests for the SAME session will WAIT here.
        // Requests for DIFFERENT sessions proceed in parallel.
        InterviewSession session = sessionRepository
            .findByIdAndUserIdForUpdate(sessionId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId));
        
        log.debug("Acquired lock on session: sessionId={}", sessionId);
        
        // ═══════════════════════════════════════════════════════════════════
        // STEP 3: DOUBLE-CHECK idempotency under lock
        // ═══════════════════════════════════════════════════════════════════
        // Another request may have created the message while we waited for lock
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<MessageCreationResult> existing = checkIdempotency(sessionId, idempotencyKey);
            if (existing.isPresent()) {
                log.info("Idempotency hit (under lock): sessionId={}, idempotencyKey={}", 
                        sessionId, idempotencyKey);
                return existing.get();
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // STEP 4: ALLOCATE sequence numbers atomically
        // ═══════════════════════════════════════════════════════════════════
        // Because we hold the lock, no other request can allocate the same seq
        long userSeq = session.allocateSeq();
        long interviewerSeq = session.allocateSeq();
        
        log.debug("Allocated sequences: userSeq={}, interviewerSeq={}", userSeq, interviewerSeq);
        
        // ═══════════════════════════════════════════════════════════════════
        // STEP 5: CREATE messages with assigned sequences
        // ═══════════════════════════════════════════════════════════════════
        Message userMessage = Message.user(content, sessionId, userSeq, idempotencyKey);
        userMessage = messageRepository.save(userMessage);
        
        Message interviewerPlaceholder = Message.interviewer("", sessionId, interviewerSeq);
        interviewerPlaceholder = messageRepository.save(interviewerPlaceholder);
        
        // Update session with new nextSeq
        sessionRepository.save(session);
        
        log.info("Created messages: userMessageId={}, interviewerMessageId={}, sessionId={}", 
                userMessage.getId(), interviewerPlaceholder.getId(), sessionId);
        
        // ═══════════════════════════════════════════════════════════════════
        // STEP 6: TRIGGER AI job after commit
        // ═══════════════════════════════════════════════════════════════════
        // Event is published inside transaction, but listener runs AFTER_COMMIT
        // This ensures we don't trigger AI job if transaction rolls back
        eventPublisher.publishEvent(new AiJobRequestedEvent(
                interviewerPlaceholder.getId(),
                sessionId,
                content
        ));
        
        return new MessageCreationResult(userMessage.getId(), interviewerPlaceholder.getId());
    }
    
    /**
     * Check if a message with this idempotency key already exists.
     * Returns the existing message IDs if found.
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
