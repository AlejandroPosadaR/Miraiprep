package com.example.aimock.session;

import com.example.aimock.ai.AIEvaluationService;
import com.example.aimock.auth.user.AuthUser;
import com.example.aimock.authz.SessionAuthorizer;
import com.example.aimock.exception.ResourceNotFoundException;
import com.example.aimock.session.dto.CreateInterviewSessionRequest;
import com.example.aimock.session.dto.EvaluationResult;
import com.example.aimock.session.dto.PaginatedSessionsResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/interview-sessions")
@RequiredArgsConstructor
public class InterviewSessionController {

    private final InterviewSessionService interviewSessionService;
    private final InterviewSessionRepository interviewSessionRepository;
    private final AIEvaluationService aiEvaluationService;
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

    @GetMapping("/paginated")
    public ResponseEntity<PaginatedSessionsResponse> getInterviewSessionsPaginated(
            @AuthenticationPrincipal AuthUser user,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "10") int limit) {
        if (limit < 1) limit = 1;
        if (limit > 50) limit = 50;
        PaginatedSessionsResponse response = interviewSessionService.getInterviewSessionsPaginated(
                user.getUserId(), cursor, limit);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<InterviewSession> getInterviewSession(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal AuthUser user) {
        sessionAuthorizer.requireOwnerForCurrentUser(sessionId, user);
        InterviewSession session = interviewSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview session", "id", sessionId));
        return ResponseEntity.ok(session);
    }

    @PostMapping("/{sessionId}/evaluate")
    public ResponseEntity<EvaluationResult> evaluateInterview(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal AuthUser user) {
        sessionAuthorizer.requireOwnerForCurrentUser(sessionId, user);
        
        InterviewSession session = interviewSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview session", "id", sessionId));

        if (session.getEvaluatedAt() != null) {
            return ResponseEntity.ok(EvaluationResult.builder()
                    .overallScore(session.getEvaluationScore())
                    .knowledge(session.getEvaluationKnowledge())
                    .communication(session.getEvaluationCommunication())
                    .problemSolving(session.getEvaluationProblemSolving())
                    .technicalDepth(session.getEvaluationTechnicalDepth())
                    .feedback(session.getEvaluationFeedback())
                    .build());
        }

        EvaluationResult result = aiEvaluationService.evaluateInterview(session);

        session.setEvaluationScore(result.getOverallScore());
        session.setEvaluationKnowledge(result.getKnowledge());
        session.setEvaluationCommunication(result.getCommunication());
        session.setEvaluationProblemSolving(result.getProblemSolving());
        session.setEvaluationTechnicalDepth(result.getTechnicalDepth());
        session.setEvaluationFeedback(result.getFeedback());
        session.setEvaluatedAt(LocalDateTime.now());
        interviewSessionRepository.save(session);

        return ResponseEntity.ok(result);
    }
}