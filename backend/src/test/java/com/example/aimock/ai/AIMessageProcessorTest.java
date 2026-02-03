package com.example.aimock.ai;

import com.example.aimock.messages.MessageRepository;
import com.example.aimock.messages.model.Message;
import com.example.aimock.messages.model.MessageRole;
import com.example.aimock.messages.model.MessageStatus;
import com.example.aimock.session.InterviewSession;
import com.example.aimock.session.InterviewSessionRepository;
import com.example.aimock.session.Status;
import com.example.aimock.websocket.SessionTopicPublisher;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Timer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AIMessageProcessor")
class AIMessageProcessorTest {

    @Mock
    private AIChatService aiChatService;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private InterviewSessionRepository sessionRepository;

    @Mock
    private SessionTopicPublisher topicPublisher;

    @Mock
    private Timer aiResponseTimer;

    @Mock
    private Timer aiTimeToFirstToken;

    @Mock
    private Counter aiProcessingSuccess;

    @Mock
    private Counter aiProcessingFailure;

    @Mock
    private PlatformTransactionManager transactionManager;

    private AIMessageProcessor processor;

    private UUID sessionId;
    private UUID interviewerMessageId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        processor = new AIMessageProcessor(
                aiChatService,
                messageRepository,
                sessionRepository,
                topicPublisher,
                aiResponseTimer,
                aiTimeToFirstToken,
                aiProcessingSuccess,
                aiProcessingFailure,
                transactionManager
        );
        ReflectionTestUtils.setField(processor, "streamingEnabled", true);

        sessionId = UUID.randomUUID();
        interviewerMessageId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("processMessage with streaming enabled")
    class ProcessMessageStreaming {

        @Test
        void processesMessageSuccessfully() throws Exception {
            Message placeholder = Message.interviewer("", sessionId, 1L);
            placeholder.setId(interviewerMessageId);
            
            InterviewSession session = InterviewSession.builder()
                    .id(sessionId)
                    .userId(userId)
                    .title("Test")
                    .interviewType("TECHNICAL")
                    .experienceYears(3)
                    .status(Status.STARTED)
                    .build();

            when(messageRepository.findById(interviewerMessageId)).thenReturn(Optional.of(placeholder));
            when(messageRepository.findBySessionIdOrderBySeqAsc(sessionId)).thenReturn(List.of());
            when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
            when(aiChatService.streamResponse(anyString(), anyList(), anyString(), anyInt(), any()))
                    .thenReturn(Flux.just("Hello", " ", "world"));
            when(aiResponseTimer.recordCallable(any())).thenAnswer(inv -> {
                try {
                    return inv.getArgument(0, java.util.concurrent.Callable.class).call();
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });

            var result = processor.processMessage(interviewerMessageId, sessionId, "User message");

            assertThat(result.getStatus()).isEqualTo(com.example.aimock.ai.dto.AIProcessingResult.Status.SUCCESS);
            assertThat(result.getAiResponse()).isEqualTo("Hello world");
            
            verify(aiProcessingSuccess).increment();
            verify(topicPublisher, atLeastOnce()).aiDelta(eq(sessionId), eq(interviewerMessageId), anyString());
            verify(topicPublisher).aiComplete(eq(sessionId), eq(interviewerMessageId), eq("Hello world"));
        }

        @Test
        void handlesPlaceholderNotFound() {
            when(messageRepository.findById(interviewerMessageId)).thenReturn(Optional.empty());

            var result = processor.processMessage(interviewerMessageId, sessionId, "Test");
            
            assertThat(result.getStatus()).isEqualTo(com.example.aimock.ai.dto.AIProcessingResult.Status.FAILED);
            assertThat(result.getErrorMessage()).contains("Placeholder not found");
            verify(aiProcessingFailure).increment();
        }

        @Test
        void handlesWrongMessageRole() {
            Message userMessage = Message.user("Test", sessionId, 1L);
            userMessage.setId(interviewerMessageId);
            
            when(messageRepository.findById(interviewerMessageId)).thenReturn(Optional.of(userMessage));

            var result = processor.processMessage(interviewerMessageId, sessionId, "Test");
            
            assertThat(result.getStatus()).isEqualTo(com.example.aimock.ai.dto.AIProcessingResult.Status.FAILED);
            assertThat(result.getErrorMessage()).contains("Not an INTERVIEWER placeholder");
            verify(aiProcessingFailure).increment();
        }

        @Test
        void handlesSessionNotFound() {
            Message placeholder = Message.interviewer("", sessionId, 1L);
            placeholder.setId(interviewerMessageId);
            
            when(messageRepository.findById(interviewerMessageId)).thenReturn(Optional.of(placeholder));
            when(sessionRepository.findById(sessionId)).thenReturn(Optional.empty());

            var result = processor.processMessage(interviewerMessageId, sessionId, "Test");

            assertThat(result.getStatus()).isEqualTo(com.example.aimock.ai.dto.AIProcessingResult.Status.FAILED);
            assertThat(result.getErrorMessage()).isNotNull()
                    .contains("Session not found")
                    .contains(sessionId.toString());
            verify(aiProcessingFailure).increment();
            // markAsFailed will try to save the message with FAILED status
            verify(messageRepository, atLeastOnce()).findById(interviewerMessageId);
        }

        @Test
        void handlesProcessingException() throws Exception {
            Message placeholder = Message.interviewer("", sessionId, 1L);
            placeholder.setId(interviewerMessageId);
            
            InterviewSession session = InterviewSession.builder()
                    .id(sessionId)
                    .userId(userId)
                    .title("Test")
                    .interviewType("TECHNICAL")
                    .experienceYears(3)
                    .status(Status.STARTED)
                    .build();

            when(messageRepository.findById(interviewerMessageId)).thenReturn(Optional.of(placeholder));
            when(messageRepository.findBySessionIdOrderBySeqAsc(sessionId)).thenReturn(List.of());
            when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
            when(aiChatService.streamResponse(anyString(), anyList(), anyString(), anyInt(), any()))
                    .thenThrow(new RuntimeException("AI service error"));
            when(aiResponseTimer.recordCallable(any())).thenAnswer(inv -> {
                try {
                    return inv.getArgument(0, java.util.concurrent.Callable.class).call();
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });

            var result = processor.processMessage(interviewerMessageId, sessionId, "Test");

            assertThat(result.getStatus()).isEqualTo(com.example.aimock.ai.dto.AIProcessingResult.Status.FAILED);
            assertThat(result.getErrorMessage()).isNotNull();
            verify(aiProcessingFailure).increment();
        }

        @Test
        void recordsTimeToFirstToken() throws Exception {
            Message placeholder = Message.interviewer("", sessionId, 1L);
            placeholder.setId(interviewerMessageId);
            
            InterviewSession session = InterviewSession.builder()
                    .id(sessionId)
                    .userId(userId)
                    .title("Test")
                    .interviewType("TECHNICAL")
                    .experienceYears(3)
                    .status(Status.STARTED)
                    .build();

            when(messageRepository.findById(interviewerMessageId)).thenReturn(Optional.of(placeholder));
            when(messageRepository.findBySessionIdOrderBySeqAsc(sessionId)).thenReturn(List.of());
            when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
            when(aiChatService.streamResponse(anyString(), anyList(), anyString(), anyInt(), any()))
                    .thenReturn(Flux.just("First", " ", "token"));
            when(aiResponseTimer.recordCallable(any())).thenAnswer(inv -> {
                try {
                    return inv.getArgument(0, java.util.concurrent.Callable.class).call();
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });

            processor.processMessage(interviewerMessageId, sessionId, "Test");

            verify(aiTimeToFirstToken, atLeastOnce()).record(anyLong(), any());
        }
    }

    @Nested
    @DisplayName("processMessage with streaming disabled")
    class ProcessMessageNonStreaming {

        @BeforeEach
        void setUp() {
            ReflectionTestUtils.setField(processor, "streamingEnabled", false);
        }

        @Test
        void usesGenerateResponseWhenStreamingDisabled() throws Exception {
            Message placeholder = Message.interviewer("", sessionId, 1L);
            placeholder.setId(interviewerMessageId);
            
            InterviewSession session = InterviewSession.builder()
                    .id(sessionId)
                    .userId(userId)
                    .title("Test")
                    .interviewType("TECHNICAL")
                    .experienceYears(3)
                    .status(Status.STARTED)
                    .build();

            when(messageRepository.findById(interviewerMessageId)).thenReturn(Optional.of(placeholder));
            when(messageRepository.findBySessionIdOrderBySeqAsc(sessionId)).thenReturn(List.of());
            when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
            when(aiChatService.generateResponse(anyString(), anyList(), anyString(), anyInt(), any()))
                    .thenReturn("Complete response");
            when(aiResponseTimer.recordCallable(any())).thenAnswer(inv -> {
                try {
                    return inv.getArgument(0, java.util.concurrent.Callable.class).call();
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });

            var result = processor.processMessage(interviewerMessageId, sessionId, "User message");

            assertThat(result.getStatus()).isEqualTo(com.example.aimock.ai.dto.AIProcessingResult.Status.SUCCESS);
            assertThat(result.getAiResponse()).isEqualTo("Complete response");
            verify(aiChatService).generateResponse(anyString(), anyList(), anyString(), anyInt(), any());
            verify(aiChatService, never()).streamResponse(anyString(), anyList(), anyString(), anyInt(), any());
        }
    }
}
