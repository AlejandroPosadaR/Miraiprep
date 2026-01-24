package com.example.aimock.authz;

import com.example.aimock.auth.user.AuthUser;
import com.example.aimock.auth.user.User;
import com.example.aimock.exception.ResourceNotFoundException;
import com.example.aimock.session.InterviewSession;
import com.example.aimock.session.InterviewSessionRepository;
import com.example.aimock.session.Status;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SessionAuthorizerTest {

    @Mock
    private InterviewSessionRepository sessionRepo;

    private SessionAuthorizer sessionAuthorizer;

    private UUID userId;
    private UUID sessionId;
    private User user;
    private AuthUser authUser;
    private InterviewSession session;

    @BeforeEach
    void setUp() {
        sessionAuthorizer = new SessionAuthorizer(sessionRepo);
        userId = UUID.randomUUID();
        sessionId = UUID.randomUUID();
        user = User.builder()
                .id(userId)
                .email("test@example.com")
                .password("encoded")
                .username("testuser")
                .firstName("Test")
                .lastName("User")
                .enabled(true)
                .emailVerified(false)
                .build();
        authUser = new AuthUser(user);
        session = InterviewSession.builder()
                .id(sessionId)
                .userId(userId)
                .title("Test Session")
                .interviewType("TECHNICAL")
                .status(Status.STARTED)
                .build();
    }

    @Nested
    @DisplayName("requireOwner")
    class RequireOwner {
        @Test
        void returnsSessionWhenUserOwnsIt() {
            when(sessionRepo.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));

            InterviewSession result = sessionAuthorizer.requireOwner(sessionId, userId);

            assertThat(result).isSameAs(session);
            verify(sessionRepo).findByIdAndUserId(sessionId, userId);
        }

        @Test
        void throwsResourceNotFoundExceptionWhenSessionNotFound() {
            when(sessionRepo.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> sessionAuthorizer.requireOwner(sessionId, userId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Session")
                    .hasMessageContaining(sessionId.toString());
        }

        @Test
        void throwsWhenUserDoesNotOwnSession() {
            UUID otherUserId = UUID.randomUUID();
            when(sessionRepo.findByIdAndUserId(sessionId, otherUserId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> sessionAuthorizer.requireOwner(sessionId, otherUserId))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("requireOwnerForCurrentUser")
    class RequireOwnerForCurrentUser {
        @Test
        void delegatesToRequireOwnerWithAuthUserUserId() {
            when(sessionRepo.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));

            InterviewSession result = sessionAuthorizer.requireOwnerForCurrentUser(sessionId, authUser);

            assertThat(result).isSameAs(session);
            verify(sessionRepo).findByIdAndUserId(sessionId, userId);
        }
    }
}
