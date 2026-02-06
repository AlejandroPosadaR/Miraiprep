package com.example.aimock.messages;

import com.example.aimock.auth.user.User;
import com.example.aimock.auth.user.UserRepository;
import com.example.aimock.messages.dto.MessageCreationResult;
import com.example.aimock.messages.model.Message;
import com.example.aimock.messages.model.MessageRole;
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
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private InterviewSessionRepository sessionRepository;

    @Mock
    private SQSService sqsService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private MessageService messageService;

    private UUID sessionId;

    @BeforeEach
    void setUp() {
        messageService = new MessageService(messageRepository, sessionRepository, userRepository, sqsService, eventPublisher);
        sessionId = UUID.randomUUID();
    }

    @Test
    @DisplayName("getMessages returns all messages for session ordered by seq")
    void getMessages_returnsAllOrderedBySeq() {
        Message m1 = Message.user("Hello", sessionId, 1L);
        Message m2 = Message.interviewer("Hi there", sessionId, 2L);
        when(messageRepository.findBySessionIdOrderBySeqAsc(sessionId)).thenReturn(List.of(m1, m2));

        List<Message> result = messageService.getMessages(sessionId, null, null);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getRole()).isEqualTo(MessageRole.USER);
        assertThat(result.get(0).getContent()).isEqualTo("Hello");
        assertThat(result.get(1).getRole()).isEqualTo(MessageRole.INTERVIEWER);
        assertThat(result.get(1).getContent()).isEqualTo("Hi there");
        verify(messageRepository).findBySessionIdOrderBySeqAsc(sessionId);
    }

    @Test
    @DisplayName("getMessages returns empty list when no messages")
    void getMessages_emptyWhenNone() {
        when(messageRepository.findBySessionIdOrderBySeqAsc(sessionId)).thenReturn(List.of());

        List<Message> result = messageService.getMessages(sessionId, null, 50);

        assertThat(result).isEmpty();
        verify(messageRepository).findBySessionIdOrderBySeqAsc(sessionId);
    }

    @Test
    @DisplayName("getMessages filters by cursor sequence")
    void getMessages_filtersByCursor() {
        Message m1 = Message.user("Hello", sessionId, 1L);
        Message m2 = Message.user("World", sessionId, 2L);
        Message m3 = Message.user("Test", sessionId, 3L);
        when(messageRepository.findBySessionIdOrderBySeqAsc(sessionId))
                .thenReturn(List.of(m1, m2, m3));

        List<Message> result = messageService.getMessages(sessionId, 1L, 10);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getSeq()).isEqualTo(2L);
        assertThat(result.get(1).getSeq()).isEqualTo(3L);
    }

    @Test
    @DisplayName("getMessages respects limit")
    void getMessages_respectsLimit() {
        Message m1 = Message.user("1", sessionId, 1L);
        Message m2 = Message.user("2", sessionId, 2L);
        Message m3 = Message.user("3", sessionId, 3L);
        when(messageRepository.findBySessionIdOrderBySeqAsc(sessionId))
                .thenReturn(List.of(m1, m2, m3));

        List<Message> result = messageService.getMessages(sessionId, null, 2);

        assertThat(result).hasSize(2);
    }

    @Nested
    @DisplayName("createUserMessageAndEnqueue")
    class CreateUserMessageAndEnqueue {
        private UUID userId;
        private InterviewSession session;
        private User user;

        @BeforeEach
        void setUp() {
            userId = UUID.randomUUID();
            session = InterviewSession.builder()
                    .id(sessionId)
                    .userId(userId)
                    .title("Test")
                    .interviewType("TECHNICAL")
                    .status(Status.STARTED)
                    .build();
            user = User.builder()
                    .id(userId)
                    .email("test@example.com")
                    .username("testuser")
                    .password("password")
                    .firstName("Test")
                    .lastName("User")
                    .tier("FREE")
                    .messageCount(0)
                    .messageLimit(30)
                    .build();
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        }

        @Test
        @DisplayName("creates user and interviewer messages successfully")
        void createsMessagesSuccessfully() {
            when(messageRepository.findBySessionIdAndIdempotencyKey(sessionId, "key-1"))
                    .thenReturn(Optional.empty());
            when(sessionRepository.findByIdAndUserIdForUpdate(sessionId, userId))
                    .thenReturn(Optional.of(session));
            when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
                Message m = inv.getArgument(0);
                if (m.getId() == null) {
                    m.setId(UUID.randomUUID());
                }
                return m;
            });

            var result = messageService.createUserMessageAndEnqueue(
                    sessionId, userId, "User content", "key-1");

            assertThat(result.getUserMessageId()).isNotNull();
            assertThat(result.getInterviewerMessageId()).isNotNull();
            verify(messageRepository, times(2)).save(any(Message.class));
            verify(sessionRepository).save(session);
            verify(userRepository).save(user);
        }

        @Test
        @DisplayName("throws when session not found")
        void throwsWhenSessionNotFound() {
            when(messageRepository.findBySessionIdAndIdempotencyKey(sessionId, "key-1"))
                    .thenReturn(Optional.empty());
            when(sessionRepository.findByIdAndUserIdForUpdate(sessionId, userId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> messageService.createUserMessageAndEnqueue(
                    sessionId, userId, "Content", "key-1"))
                    .isInstanceOf(com.example.aimock.exception.ResourceNotFoundException.class);
            verify(userRepository).findById(userId);
        }

        @Test
        @DisplayName("allocates sequence numbers correctly")
        void allocatesSequenceNumbers() {
            when(messageRepository.findBySessionIdAndIdempotencyKey(sessionId, "key-1"))
                    .thenReturn(Optional.empty());
            when(sessionRepository.findByIdAndUserIdForUpdate(sessionId, userId))
                    .thenReturn(Optional.of(session));
            when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
                Message m = inv.getArgument(0);
                if (m.getId() == null) {
                    m.setId(UUID.randomUUID());
                }
                return m;
            });

            messageService.createUserMessageAndEnqueue(sessionId, userId, "Content", "key-1");

            verify(sessionRepository).save(argThat(s -> s.getNextSeq() > 0));
            verify(userRepository).save(user);
        }
        
        @Test
        @DisplayName("sets idempotency key on user message")
        void setsIdempotencyKeyOnUserMessage() {
            when(messageRepository.findBySessionIdAndIdempotencyKey(sessionId, "unique-key-123"))
                    .thenReturn(Optional.empty());
            when(sessionRepository.findByIdAndUserIdForUpdate(sessionId, userId))
                    .thenReturn(Optional.of(session));
            when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
                Message m = inv.getArgument(0);
                if (m.getId() == null) {
                    m.setId(UUID.randomUUID());
                }
                return m;
            });

            messageService.createUserMessageAndEnqueue(sessionId, userId, "Content", "unique-key-123");

            verify(messageRepository).save(argThat(m -> 
                    m.getRole() == MessageRole.USER && 
                    "unique-key-123".equals(m.getIdempotencyKey())
            ));
            verify(userRepository).save(user);
        }
    }
    
    @Nested
    @DisplayName("Idempotency")
    class Idempotency {
        private UUID userId;
        private InterviewSession session;
        private User user;

        @BeforeEach
        void setUp() {
            userId = UUID.randomUUID();
            session = InterviewSession.builder()
                    .id(sessionId)
                    .userId(userId)
                    .title("Test")
                    .interviewType("TECHNICAL")
                    .status(Status.STARTED)
                    .build();
            user = User.builder()
                    .id(userId)
                    .email("test@example.com")
                    .username("testuser")
                    .password("password")
                    .firstName("Test")
                    .lastName("User")
                    .tier("FREE")
                    .messageCount(0)
                    .messageLimit(30)
                    .build();
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        }
        
        @Test
        @DisplayName("returns existing message on duplicate request (fast path)")
        void returnsExistingOnDuplicate_fastPath() {
            UUID existingUserMsgId = UUID.randomUUID();
            UUID existingInterviewerMsgId = UUID.randomUUID();
            
            Message existingUserMessage = Message.user("Original content", sessionId, 1L, "dup-key");
            existingUserMessage.setId(existingUserMsgId);
            
            Message existingInterviewerMessage = Message.interviewer("AI response", sessionId, 2L);
            existingInterviewerMessage.setId(existingInterviewerMsgId);
            
            // Fast path: found without lock
            when(messageRepository.findBySessionIdAndIdempotencyKey(sessionId, "dup-key"))
                    .thenReturn(Optional.of(existingUserMessage));
            when(messageRepository.findInterviewerMessageAfterSeq(sessionId, 1L))
                    .thenReturn(Optional.of(existingInterviewerMessage));

            var result = messageService.createUserMessageAndEnqueue(
                    sessionId, userId, "Duplicate content", "dup-key");

            // Should return existing IDs
            assertThat(result.getUserMessageId()).isEqualTo(existingUserMsgId);
            assertThat(result.getInterviewerMessageId()).isEqualTo(existingInterviewerMsgId);
            
            // Should NOT create new messages
            verify(messageRepository, never()).save(any(Message.class));
            verify(sessionRepository, never()).findByIdAndUserIdForUpdate(any(), any());
            // Message limit check still happens before idempotency check
            verify(userRepository).findById(userId);
            verify(userRepository, never()).save(any(User.class));
        }
        
        @Test
        @DisplayName("returns existing message on duplicate request (under lock)")
        void returnsExistingOnDuplicate_underLock() {
            UUID existingUserMsgId = UUID.randomUUID();
            UUID existingInterviewerMsgId = UUID.randomUUID();
            
            Message existingUserMessage = Message.user("Original content", sessionId, 1L, "dup-key");
            existingUserMessage.setId(existingUserMsgId);
            
            Message existingInterviewerMessage = Message.interviewer("AI response", sessionId, 2L);
            existingInterviewerMessage.setId(existingInterviewerMsgId);
            
            // Fast path: not found
            // Under lock: found (simulates concurrent insert)
            when(messageRepository.findBySessionIdAndIdempotencyKey(sessionId, "dup-key"))
                    .thenReturn(Optional.empty())  // First call (fast path)
                    .thenReturn(Optional.of(existingUserMessage));  // Second call (under lock)
            when(sessionRepository.findByIdAndUserIdForUpdate(sessionId, userId))
                    .thenReturn(Optional.of(session));
            when(messageRepository.findInterviewerMessageAfterSeq(sessionId, 1L))
                    .thenReturn(Optional.of(existingInterviewerMessage));

            var result = messageService.createUserMessageAndEnqueue(
                    sessionId, userId, "Duplicate content", "dup-key");

            // Should return existing IDs
            assertThat(result.getUserMessageId()).isEqualTo(existingUserMsgId);
            assertThat(result.getInterviewerMessageId()).isEqualTo(existingInterviewerMsgId);
            
            // Should NOT create new messages
            verify(messageRepository, never()).save(any(Message.class));
            
            // Should have acquired lock (to double-check)
            verify(sessionRepository).findByIdAndUserIdForUpdate(sessionId, userId);
            // Message limit check still happens before idempotency check
            verify(userRepository).findById(userId);
            verify(userRepository, never()).save(any(User.class));
        }
        
        @Test
        @DisplayName("handles null idempotency key gracefully")
        void handlesNullIdempotencyKey() {
            when(sessionRepository.findByIdAndUserIdForUpdate(sessionId, userId))
                    .thenReturn(Optional.of(session));
            when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
                Message m = inv.getArgument(0);
                if (m.getId() == null) {
                    m.setId(UUID.randomUUID());
                }
                return m;
            });

            var result = messageService.createUserMessageAndEnqueue(
                    sessionId, userId, "Content", null);

            assertThat(result.getUserMessageId()).isNotNull();
            
            // Should NOT check for existing (null key)
            verify(messageRepository, never()).findBySessionIdAndIdempotencyKey(any(), any());
            verify(userRepository).save(user);
        }
        
        @Test
        @DisplayName("handles blank idempotency key gracefully")
        void handlesBlankIdempotencyKey() {
            when(sessionRepository.findByIdAndUserIdForUpdate(sessionId, userId))
                    .thenReturn(Optional.of(session));
            when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
                Message m = inv.getArgument(0);
                if (m.getId() == null) {
                    m.setId(UUID.randomUUID());
                }
                return m;
            });

            var result = messageService.createUserMessageAndEnqueue(
                    sessionId, userId, "Content", "   ");

            assertThat(result.getUserMessageId()).isNotNull();
            
            // Should NOT check for existing (blank key)
            verify(messageRepository, never()).findBySessionIdAndIdempotencyKey(any(), any());
            verify(userRepository).save(user);
        }
        
        @Test
        @DisplayName("different idempotency keys create different messages")
        void differentKeysCreateDifferentMessages() {
            when(messageRepository.findBySessionIdAndIdempotencyKey(eq(sessionId), anyString()))
                    .thenReturn(Optional.empty());
            when(sessionRepository.findByIdAndUserIdForUpdate(sessionId, userId))
                    .thenReturn(Optional.of(session));
            when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
                Message m = inv.getArgument(0);
                if (m.getId() == null) {
                    m.setId(UUID.randomUUID());
                }
                return m;
            });

            var result1 = messageService.createUserMessageAndEnqueue(
                    sessionId, userId, "First", "key-1");
            var result2 = messageService.createUserMessageAndEnqueue(
                    sessionId, userId, "Second", "key-2");

            assertThat(result1.getUserMessageId()).isNotEqualTo(result2.getUserMessageId());
            verify(messageRepository, times(4)).save(any(Message.class)); // 2 user + 2 interviewer
            verify(userRepository, times(2)).save(user); // User message count incremented twice
        }
    }
}
