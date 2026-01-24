package com.example.aimock.session;

import com.example.aimock.auth.user.AuthUser;
import com.example.aimock.authz.SessionAuthorizer;
import com.example.aimock.session.dto.CreateInterviewSessionRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/interview-sessions")
@RequiredArgsConstructor
public class InterviewSessionController {

    private final InterviewSessionService interviewSessionService;
    private final SessionAuthorizer sessionAuthorizer;

    @PostMapping
    public ResponseEntity<InterviewSession> createInterviewSession(@Valid @RequestBody CreateInterviewSessionRequest request) {
        InterviewSession interviewSession = interviewSessionService.createInterviewSession(request);
        return ResponseEntity.ok(interviewSession);
    }

    @PutMapping("/{sessionId}/complete")
    public ResponseEntity<InterviewSession> completeInterviewSession(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal AuthUser user) {
        sessionAuthorizer.requireOwnerForCurrentUser(sessionId, user);
        InterviewSession interviewSession = interviewSessionService.completeInterviewSession(sessionId, user.getUserId());
        return ResponseEntity.ok(interviewSession);
    }

    @PutMapping("/{sessionId}/abort")
    public ResponseEntity<InterviewSession> abortInterviewSession(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal AuthUser user) {
        sessionAuthorizer.requireOwnerForCurrentUser(sessionId, user);
        InterviewSession interviewSession = interviewSessionService.abortInterviewSession(sessionId, user.getUserId());
        return ResponseEntity.ok(interviewSession);
    }

    @GetMapping
    public ResponseEntity<List<InterviewSession>> getInterviewSessions(@AuthenticationPrincipal AuthUser user) {
        List<InterviewSession> interviewSessions = interviewSessionService.getInterviewSessions(user.getUserId());
        return ResponseEntity.ok(interviewSessions);
    }
}