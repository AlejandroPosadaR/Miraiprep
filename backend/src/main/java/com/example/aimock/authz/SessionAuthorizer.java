package com.example.aimock.authz;

import com.example.aimock.auth.user.AuthUser;
import com.example.aimock.exception.ResourceNotFoundException;
import com.example.aimock.session.InterviewSession;
import com.example.aimock.session.InterviewSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Shared authorization for session access.
 * Used by both session and message controllers.
 */
@Service
@RequiredArgsConstructor
public class SessionAuthorizer {

    private final InterviewSessionRepository sessionRepo;

    /**
     * Verifies user owns the session. Returns session if authorized.
     * Throws ResourceNotFoundException to avoid leaking session existence.
     */
    public InterviewSession requireOwner(UUID sessionId, UUID userId) {
        return sessionRepo.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId));
    }

    /**
     * Verifies session access for the current authenticated user.
     * Use this when you have @AuthenticationPrincipal AuthUser in controller.
     */
    public InterviewSession requireOwnerForCurrentUser(UUID sessionId, AuthUser authUser) {
        return requireOwner(sessionId, authUser.getUserId());
    }
}
