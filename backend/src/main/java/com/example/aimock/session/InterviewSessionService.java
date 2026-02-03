package com.example.aimock.session;

import com.example.aimock.auth.user.UserRepository;
import com.example.aimock.exception.ResourceNotFoundException;
import com.example.aimock.exception.ValidationException;
import com.example.aimock.session.dto.CreateInterviewSessionRequest;
import com.example.aimock.session.dto.PaginatedSessionsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
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
                .experienceYears(request.getExperienceYears() != null ? request.getExperienceYears() : 2)
                .jobDescription(request.getJobDescription())
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

    @Transactional(readOnly = true)
    public List<InterviewSession> getInterviewSessions(UUID userId) {
        return interviewSessionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public PaginatedSessionsResponse getInterviewSessionsPaginated(UUID userId, String cursor, int limit) {
        List<InterviewSession> sessions;
        
        if (cursor != null && !cursor.isEmpty()) {
            LocalDateTime cursorDate = decodeCursor(cursor);
            sessions = interviewSessionRepository.findByUserIdWithCursor(
                    userId, cursorDate, PageRequest.of(0, limit + 1));
        } else {
            sessions = interviewSessionRepository.findByUserIdPaginated(
                    userId, PageRequest.of(0, limit + 1));
        }

        boolean hasMore = sessions.size() > limit;
        if (hasMore) {
            sessions = sessions.subList(0, limit);
        }

        String nextCursor = null;
        if (hasMore && !sessions.isEmpty()) {
            InterviewSession lastSession = sessions.get(sessions.size() - 1);
            nextCursor = encodeCursor(lastSession.getCreatedAt());
        }

        int totalCount = interviewSessionRepository.countByUserId(userId);

        return PaginatedSessionsResponse.builder()
                .sessions(sessions)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .totalCount(totalCount)
                .build();
    }

    private String encodeCursor(LocalDateTime dateTime) {
        String formatted = dateTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        return Base64.getUrlEncoder().encodeToString(formatted.getBytes());
    }

    private LocalDateTime decodeCursor(String cursor) {
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(cursor));
            return LocalDateTime.parse(decoded, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception e) {
            throw new ValidationException("Invalid cursor format");
        }
    }
}