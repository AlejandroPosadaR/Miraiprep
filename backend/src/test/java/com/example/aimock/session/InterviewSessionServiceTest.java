package com.example.aimock.session;

import com.example.aimock.auth.user.UserRepository;
import com.example.aimock.exception.ResourceNotFoundException;
import com.example.aimock.exception.ValidationException;
import com.example.aimock.session.dto.CreateInterviewSessionRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewSessionServiceTest {

    @Mock
    private InterviewSessionRepository interviewSessionRepository;

    @Mock
    private UserRepository userRepository;

    private InterviewSessionService service;

    private UUID userId;
    private UUID sessionId;

    @BeforeEach
    void setUp() {
        service = new InterviewSessionService(interviewSessionRepository, userRepository);
        userId = UUID.randomUUID();
        sessionId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("createInterviewSession")
    class CreateInterviewSession {
        @Test
        void createsSessionWhenRequestValid() {
            CreateInterviewSessionRequest request = new CreateInterviewSessionRequest(
                    userId, "My Interview", "TECHNICAL");
            when(userRepository.existsById(userId)).thenReturn(true);
            when(interviewSessionRepository.save(any(InterviewSession.class))).thenAnswer(inv -> {
                InterviewSession s = inv.getArgument(0);
                return InterviewSession.builder()
                        .id(sessionId)
                        .userId(s.getUserId())
                        .title(s.getTitle())
                        .interviewType(s.getInterviewType())
                        .status(s.getStatus())
                        .build();
            });

            InterviewSession result = service.createInterviewSession(request);

            assertThat(result).isNotNull();
            assertThat(result.getUserId()).isEqualTo(userId);
            assertThat(result.getTitle()).isEqualTo("My Interview");
            assertThat(result.getInterviewType()).isEqualTo("TECHNICAL");
            assertThat(result.getStatus()).isEqualTo(Status.PENDING);

            ArgumentCaptor<InterviewSession> captor = ArgumentCaptor.forClass(InterviewSession.class);
            verify(interviewSessionRepository).save(captor.capture());
            assertThat(captor.getValue().getTitle()).isEqualTo("My Interview");
        }

        @Test
        void throwsWhenUserNotFound() {
            CreateInterviewSessionRequest request = new CreateInterviewSessionRequest(
                    userId, "Title", "TECHNICAL");
            when(userRepository.existsById(userId)).thenReturn(false);

            assertThatThrownBy(() -> service.createInterviewSession(request))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("User");
        }

        @Test
        void throwsWhenInterviewTypeEmpty() {
            CreateInterviewSessionRequest request = new CreateInterviewSessionRequest(
                    userId, "Title", "   ");
            when(userRepository.existsById(userId)).thenReturn(true);

            assertThatThrownBy(() -> service.createInterviewSession(request))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("Interview type");
        }

        @Test
        void throwsWhenInterviewTypeNull() {
            CreateInterviewSessionRequest request = new CreateInterviewSessionRequest(
                    userId, "Title", null);
            when(userRepository.existsById(userId)).thenReturn(true);

            assertThatThrownBy(() -> service.createInterviewSession(request))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("Interview type");
        }
    }

    @Nested
    @DisplayName("completeInterviewSession")
    class CompleteInterviewSession {
        @Test
        void completesSessionWhenOwnedAndNotCompleted() {
            InterviewSession session = InterviewSession.builder()
                    .id(sessionId)
                    .userId(userId)
                    .title("T")
                    .interviewType("TECH")
                    .status(Status.STARTED)
                    .build();
            when(interviewSessionRepository.findByIdAndUserId(sessionId, userId))
                    .thenReturn(Optional.of(session));
            when(interviewSessionRepository.save(any(InterviewSession.class))).thenAnswer(inv -> inv.getArgument(0));

            InterviewSession result = service.completeInterviewSession(sessionId, userId);

            assertThat(result.getStatus()).isEqualTo(Status.COMPLETED);
            assertThat(result.getEndedAt()).isNotNull();
            verify(interviewSessionRepository).save(session);
        }

        @Test
        void throwsWhenSessionNotFound() {
            when(interviewSessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.completeInterviewSession(sessionId, userId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Interview session");
        }

        @Test
        void throwsWhenAlreadyCompleted() {
            InterviewSession session = InterviewSession.builder()
                    .id(sessionId)
                    .userId(userId)
                    .title("T")
                    .interviewType("TECH")
                    .status(Status.COMPLETED)
                    .build();
            when(interviewSessionRepository.findByIdAndUserId(sessionId, userId))
                    .thenReturn(Optional.of(session));

            assertThatThrownBy(() -> service.completeInterviewSession(sessionId, userId))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("already completed");
        }

        @Test
        void throwsWhenAborted() {
            InterviewSession session = InterviewSession.builder()
                    .id(sessionId)
                    .userId(userId)
                    .title("T")
                    .interviewType("TECH")
                    .status(Status.ABORTED)
                    .build();
            when(interviewSessionRepository.findByIdAndUserId(sessionId, userId))
                    .thenReturn(Optional.of(session));

            assertThatThrownBy(() -> service.completeInterviewSession(sessionId, userId))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("aborted");
        }
    }

    @Nested
    @DisplayName("abortInterviewSession")
    class AbortInterviewSession {
        @Test
        void abortsSessionWhenOwnedAndNotAborted() {
            InterviewSession session = InterviewSession.builder()
                    .id(sessionId)
                    .userId(userId)
                    .title("T")
                    .interviewType("TECH")
                    .status(Status.STARTED)
                    .build();
            when(interviewSessionRepository.findByIdAndUserId(sessionId, userId))
                    .thenReturn(Optional.of(session));
            when(interviewSessionRepository.save(any(InterviewSession.class))).thenAnswer(inv -> inv.getArgument(0));

            InterviewSession result = service.abortInterviewSession(sessionId, userId);

            assertThat(result.getStatus()).isEqualTo(Status.ABORTED);
            assertThat(result.getEndedAt()).isNotNull();
            verify(interviewSessionRepository).save(session);
        }

        @Test
        void throwsWhenAlreadyAborted() {
            InterviewSession session = InterviewSession.builder()
                    .id(sessionId)
                    .userId(userId)
                    .title("T")
                    .interviewType("TECH")
                    .status(Status.ABORTED)
                    .build();
            when(interviewSessionRepository.findByIdAndUserId(sessionId, userId))
                    .thenReturn(Optional.of(session));

            assertThatThrownBy(() -> service.abortInterviewSession(sessionId, userId))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("already aborted");
        }
    }

    @Nested
    @DisplayName("getInterviewSessions")
    class GetInterviewSessions {
        @Test
        void returnsSessionsOrderedByCreatedAtDesc() {
            InterviewSession s1 = InterviewSession.builder().id(UUID.randomUUID()).userId(userId).title("A").interviewType("T").build();
            when(interviewSessionRepository.findByUserIdOrderByCreatedAtDesc(userId))
                    .thenReturn(List.of(s1));

            List<InterviewSession> result = service.getInterviewSessions(userId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0)).isSameAs(s1);
            verify(interviewSessionRepository).findByUserIdOrderByCreatedAtDesc(userId);
        }
    }
}
