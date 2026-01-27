package com.example.aimock.authz;

import com.example.aimock.auth.user.AuthUser;
import com.example.aimock.exception.ResourceNotFoundException;
import com.example.aimock.session.InterviewSession;
import com.example.aimock.session.InterviewSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SessionAuthorizer {

    private final InterviewSessionRepository sessionRepo;

    public InterviewSession requireOwner(UUID sessionId, UUID userId) {
        return sessionRepo.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId));
    }

    public InterviewSession requireOwnerForCurrentUser(UUID sessionId, AuthUser authUser) {
        return requireOwner(sessionId, authUser.getUserId());
    }
}
