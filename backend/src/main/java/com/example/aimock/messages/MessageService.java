package com.example.aimock.messages;

import com.example.aimock.exception.ResourceNotFoundException;
import com.example.aimock.messages.dto.MessageCreationResult;
import com.example.aimock.messages.events.AiJobRequestedEvent;
import com.example.aimock.messages.model.Message;
import com.example.aimock.session.InterviewSession;
import com.example.aimock.session.InterviewSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final InterviewSessionRepository sessionRepository;
    private final SQSService sqsService;
    private final ApplicationEventPublisher eventPublisher;

    public List<Message> getMessages(UUID sessionId, Long cursorSeq, Integer limit) {
        List<Message> all = messageRepository.findBySessionIdOrderBySeqAsc(sessionId);
        return all.stream()
                .filter(m -> cursorSeq == null || m.getSeq() > cursorSeq)
                .limit(limit != null && limit > 0 ? limit : Integer.MAX_VALUE)
                .collect(Collectors.toList());
    }

    @Transactional
    public MessageCreationResult createUserMessageAndEnqueue(
            UUID sessionId, 
            UUID userId, 
            String content,
            String idempotencyKey) {
        
        // 1. Lock session with pessimistic write
        InterviewSession session = sessionRepository
            .findByIdAndUserIdForUpdate(sessionId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId));
        
        // 2. Allocate sequence numbers
        long userSeq = session.allocateSeq();
        long interviewerSeq = session.allocateSeq();
        
        // 3. Create USER message
        Message userMessage = Message.user(content, sessionId, userSeq);
        userMessage = messageRepository.save(userMessage);
        
        // 4. Create INTERVIEWER placeholder
        Message interviewerPlaceholder = Message.interviewer("", sessionId, interviewerSeq);
        interviewerPlaceholder = messageRepository.save(interviewerPlaceholder);
        
        // 5. Save session (nextSeq updated)
        sessionRepository.save(session);
        
        // 6. Enqueue SQS job AFTER COMMIT (idiomatic Spring).
        // We publish an event inside the transaction and handle it with a
        // @TransactionalEventListener(phase = AFTER_COMMIT).
        eventPublisher.publishEvent(new AiJobRequestedEvent(
                interviewerPlaceholder.getId(),
                sessionId,
                content
        ));
        
        return new MessageCreationResult(userMessage.getId(), interviewerPlaceholder.getId());
    }
}
