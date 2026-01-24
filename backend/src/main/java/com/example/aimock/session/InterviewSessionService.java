package com.example.aimock.session;

import com.example.aimock.auth.user.UserRepository;
import com.example.aimock.exception.ResourceNotFoundException;
import com.example.aimock.exception.ValidationException;
import com.example.aimock.session.dto.CreateInterviewSessionRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import java.util.Optional;

import com.example.aimock.session.Status;

import com.example.aimock.session.InterviewSession;
import com.example.aimock.session.InterviewSessionRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewSessionService {

    private final InterviewSessionRepository interviewSessionRepository;
    private final UserRepository userRepository;

    @Transactional
    public InterviewSession createInterviewSession(CreateInterviewSessionRequest request) {
        if (!userRepository.existsById(request.getUserId())) {
            throw new ResourceNotFoundException("User", "id", request.getUserId());
        }

        if (request.getInterviewType() == null || request.getInterviewType().trim().isEmpty()) {
            throw new ValidationException("Interview type cannot be empty");
        }

        InterviewSession interviewSession = InterviewSession.builder()
                .title(request.getTitle())
                .interviewType(request.getInterviewType().trim())
                .userId(request.getUserId())
                .status(Status.PENDING)
                .build();

        try {
            return interviewSessionRepository.save(interviewSession);
        } catch (DataIntegrityViolationException e) {
            log.error("Database constraint violation while creating interview session", e);
            throw new ValidationException(
                "Failed to create interview session due to data constraint violation: " + 
                e.getMostSpecificCause().getMessage()
            );
        }
    }

    @Transactional
    public InterviewSession completeInterviewSession(UUID sessionId, UUID userId) {
        InterviewSession session = interviewSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview session", "id", sessionId));


        if (session.getStatus() == Status.COMPLETED) {
            throw new ValidationException("Interview session is already completed");
        }
        
        if (session.getStatus() == Status.ABORTED) {
            throw new ValidationException("Cannot complete an aborted interview session");
        }
        
        session.setStatus(Status.COMPLETED);
        session.setEndedAt(LocalDateTime.now());
        
        return interviewSessionRepository.save(session);
    }

    @Transactional
    public InterviewSession abortInterviewSession(UUID sessionId, UUID userId) {
        InterviewSession session = interviewSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview session", "id", sessionId));

        if (session.getStatus() == Status.ABORTED) {
            throw new ValidationException("Interview session is already aborted");
        }

        session.setStatus(Status.ABORTED);
        session.setEndedAt(LocalDateTime.now());

        return interviewSessionRepository.save(session);
    }

    @Transactional
    public List<InterviewSession> getInterviewSessions(UUID userId) {
        return interviewSessionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}