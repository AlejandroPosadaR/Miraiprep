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

import com.example.aimock.session.dto.PaginatedSessionsResponse;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
                    userId, "My Interview", "TECHNICAL", 2, null);
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
                    userId, "Title", "TECHNICAL", 2, null);
            when(userRepository.existsById(userId)).thenReturn(false);

            assertThatThrownBy(() -> service.createInterviewSession(request))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("User");
        }

        @Test
        void throwsWhenInterviewTypeEmpty() {
            CreateInterviewSessionRequest request = new CreateInterviewSessionRequest(
                    userId, "Title", "   ", 2, null);
            when(userRepository.existsById(userId)).thenReturn(true);

            assertThatThrownBy(() -> service.createInterviewSession(request))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("Interview type");
        }

        @Test
        void throwsWhenInterviewTypeNull() {
            CreateInterviewSessionRequest request = new CreateInterviewSessionRequest(
                    userId, "Title", null, 2, null);
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

    @Nested
    @DisplayName("getInterviewSessionsPaginated")
    class GetInterviewSessionsPaginated {
        
        private InterviewSession createSession(String title, LocalDateTime createdAt) {
            return InterviewSession.builder()
                    .id(UUID.randomUUID())
                    .userId(userId)
                    .title(title)
                    .interviewType("TECHNICAL")
                    .status(Status.PENDING)
                    .createdAt(createdAt)
                    .build();
        }

        @Test
        void returnsFirstPageWithNoCursor() {
            LocalDateTime now = LocalDateTime.now();
            InterviewSession s1 = createSession("Session 1", now);
            InterviewSession s2 = createSession("Session 2", now.minusHours(1));
            
            when(interviewSessionRepository.findByUserIdPaginated(eq(userId), any(PageRequest.class)))
                    .thenReturn(List.of(s1, s2));
            when(interviewSessionRepository.countByUserId(userId)).thenReturn(2);

            PaginatedSessionsResponse response = service.getInterviewSessionsPaginated(userId, null, 10);

            assertThat(response.getSessions()).hasSize(2);
            assertThat(response.isHasMore()).isFalse();
            assertThat(response.getNextCursor()).isNull();
            assertThat(response.getTotalCount()).isEqualTo(2);
        }

        @Test
        void returnsHasMoreWhenMoreSessionsExist() {
            LocalDateTime now = LocalDateTime.now();
            InterviewSession s1 = createSession("Session 1", now);
            InterviewSession s2 = createSession("Session 2", now.minusHours(1));
            InterviewSession s3 = createSession("Session 3", now.minusHours(2));
            
            when(interviewSessionRepository.findByUserIdPaginated(eq(userId), any(PageRequest.class)))
                    .thenReturn(List.of(s1, s2, s3));
            when(interviewSessionRepository.countByUserId(userId)).thenReturn(5);

            PaginatedSessionsResponse response = service.getInterviewSessionsPaginated(userId, null, 2);

            assertThat(response.getSessions()).hasSize(2);
            assertThat(response.isHasMore()).isTrue();
            assertThat(response.getNextCursor()).isNotNull();
            assertThat(response.getTotalCount()).isEqualTo(5);
        }

        @Test
        void usesCorrectCursorForNextPage() {
            LocalDateTime now = LocalDateTime.now();
            InterviewSession s1 = createSession("Session 1", now);
            InterviewSession s2 = createSession("Session 2", now.minusHours(1));
            InterviewSession s3 = createSession("Session 3", now.minusHours(2));
            
            when(interviewSessionRepository.findByUserIdPaginated(eq(userId), any(PageRequest.class)))
                    .thenReturn(List.of(s1, s2, s3));
            when(interviewSessionRepository.countByUserId(userId)).thenReturn(5);

            PaginatedSessionsResponse response = service.getInterviewSessionsPaginated(userId, null, 2);
            String nextCursor = response.getNextCursor();
            
            assertThat(nextCursor).isNotNull();
            
            when(interviewSessionRepository.findByUserIdWithCursor(eq(userId), any(LocalDateTime.class), any(PageRequest.class)))
                    .thenReturn(List.of(s3));
            when(interviewSessionRepository.countByUserId(userId)).thenReturn(5);

            PaginatedSessionsResponse secondPage = service.getInterviewSessionsPaginated(userId, nextCursor, 2);
            
            assertThat(secondPage.getSessions()).hasSize(1);
            assertThat(secondPage.isHasMore()).isFalse();
        }

        @Test
        void returnsEmptyListWhenNoSessions() {
            when(interviewSessionRepository.findByUserIdPaginated(eq(userId), any(PageRequest.class)))
                    .thenReturn(List.of());
            when(interviewSessionRepository.countByUserId(userId)).thenReturn(0);

            PaginatedSessionsResponse response = service.getInterviewSessionsPaginated(userId, null, 10);

            assertThat(response.getSessions()).isEmpty();
            assertThat(response.isHasMore()).isFalse();
            assertThat(response.getNextCursor()).isNull();
            assertThat(response.getTotalCount()).isZero();
        }

        @Test
        void throwsValidationExceptionForInvalidCursor() {
            assertThatThrownBy(() -> service.getInterviewSessionsPaginated(userId, "invalid-cursor", 10))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("Invalid cursor");
        }
    }

    @Nested
    @DisplayName("createInterviewSession with job description")
    class CreateInterviewSessionWithJobDescription {
        @Test
        void savesJobDescription() {
            String jobDescription = "Looking for a senior Java developer with Spring Boot experience";
            CreateInterviewSessionRequest request = new CreateInterviewSessionRequest(
                    userId, "Backend Interview", "TECHNICAL", 5, jobDescription);
            
            when(userRepository.existsById(userId)).thenReturn(true);
            when(interviewSessionRepository.save(any(InterviewSession.class))).thenAnswer(inv -> {
                InterviewSession s = inv.getArgument(0);
                return InterviewSession.builder()
                        .id(sessionId)
                        .userId(s.getUserId())
                        .title(s.getTitle())
                        .interviewType(s.getInterviewType())
                        .jobDescription(s.getJobDescription())
                        .experienceYears(s.getExperienceYears())
                        .status(s.getStatus())
                        .build();
            });

            InterviewSession result = service.createInterviewSession(request);

            assertThat(result.getJobDescription()).isEqualTo(jobDescription);
            assertThat(result.getExperienceYears()).isEqualTo(5);
            
            ArgumentCaptor<InterviewSession> captor = ArgumentCaptor.forClass(InterviewSession.class);
            verify(interviewSessionRepository).save(captor.capture());
            assertThat(captor.getValue().getJobDescription()).isEqualTo(jobDescription);
        }

        @Test
        void handlesNullJobDescription() {
            CreateInterviewSessionRequest request = new CreateInterviewSessionRequest(
                    userId, "Quick Interview", "BEHAVIORAL", 2, null);
            
            when(userRepository.existsById(userId)).thenReturn(true);
            when(interviewSessionRepository.save(any(InterviewSession.class))).thenAnswer(inv -> {
                InterviewSession s = inv.getArgument(0);
                return InterviewSession.builder()
                        .id(sessionId)
                        .userId(s.getUserId())
                        .title(s.getTitle())
                        .interviewType(s.getInterviewType())
                        .jobDescription(s.getJobDescription())
                        .status(s.getStatus())
                        .build();
            });

            InterviewSession result = service.createInterviewSession(request);

            assertThat(result.getJobDescription()).isNull();
        }

        @Test
        void defaultsExperienceYearsWhenNull() {
            CreateInterviewSessionRequest request = new CreateInterviewSessionRequest(
                    userId, "Interview", "OOP", null, null);
            
            when(userRepository.existsById(userId)).thenReturn(true);
            when(interviewSessionRepository.save(any(InterviewSession.class))).thenAnswer(inv -> {
                InterviewSession s = inv.getArgument(0);
                return InterviewSession.builder()
                        .id(sessionId)
                        .userId(s.getUserId())
                        .title(s.getTitle())
                        .interviewType(s.getInterviewType())
                        .experienceYears(s.getExperienceYears())
                        .status(s.getStatus())
                        .build();
            });

            InterviewSession result = service.createInterviewSession(request);

            assertThat(result.getExperienceYears()).isEqualTo(2);
        }
    }
}
