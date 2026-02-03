package com.example.aimock.messages;

import com.example.aimock.messages.model.Message;
import com.example.aimock.messages.model.MessageRole;
import com.example.aimock.messages.model.MessageStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Message")
class MessageTest {

    private final UUID sessionId = UUID.randomUUID();

    @Nested
    @DisplayName("Factory methods")
    class FactoryMethods {

        @Test
        void userCreatesUserMessage() {
            Message message = Message.user("Hello", sessionId, 1L);

            assertThat(message.getRole()).isEqualTo(MessageRole.USER);
            assertThat(message.getContent()).isEqualTo("Hello");
            assertThat(message.getSessionId()).isEqualTo(sessionId);
            assertThat(message.getSeq()).isEqualTo(1L);
            // User messages are COMPLETED immediately (no processing needed)
            assertThat(message.getMessageStatus()).isEqualTo(MessageStatus.COMPLETED);
        }
        
        @Test
        void userCreatesUserMessageWithIdempotencyKey() {
            Message message = Message.user("Hello", sessionId, 1L, "key-123");

            assertThat(message.getRole()).isEqualTo(MessageRole.USER);
            assertThat(message.getIdempotencyKey()).isEqualTo("key-123");
            assertThat(message.getMessageStatus()).isEqualTo(MessageStatus.COMPLETED);
        }

        @Test
        void interviewerCreatesInterviewerMessage() {
            Message message = Message.interviewer("Hi there", sessionId, 2L);

            assertThat(message.getRole()).isEqualTo(MessageRole.INTERVIEWER);
            assertThat(message.getContent()).isEqualTo("Hi there");
            assertThat(message.getSessionId()).isEqualTo(sessionId);
            assertThat(message.getSeq()).isEqualTo(2L);
            // Interviewer placeholders start as PENDING (waiting for AI)
            assertThat(message.getMessageStatus()).isEqualTo(MessageStatus.PENDING);
            // Interviewer messages don't need idempotency keys
            assertThat(message.getIdempotencyKey()).isNull();
        }
    }

    @Nested
    @DisplayName("Message content")
    class MessageContent {

        @Test
        void handlesLongContent() {
            String longContent = "A".repeat(5000);
            Message message = Message.user(longContent, sessionId, 1L);

            assertThat(message.getContent()).hasSize(5000);
        }

        @Test
        void handlesEmptyContent() {
            Message message = Message.user("", sessionId, 1L);

            assertThat(message.getContent()).isEmpty();
        }

        @Test
        void handlesSpecialCharacters() {
            String content = "Hello! @#$%^&*() 日本語 émoji 🎉";
            Message message = Message.user(content, sessionId, 1L);

            assertThat(message.getContent()).isEqualTo(content);
        }
    }

    @Nested
    @DisplayName("Sequence numbers")
    class SequenceNumbers {

        @Test
        void handlesZeroSequence() {
            Message message = Message.user("Test", sessionId, 0L);

            assertThat(message.getSeq()).isZero();
        }

        @Test
        void handlesLargeSequence() {
            Message message = Message.user("Test", sessionId, Long.MAX_VALUE);

            assertThat(message.getSeq()).isEqualTo(Long.MAX_VALUE);
        }
    }

    @Nested
    @DisplayName("Status transitions")
    class StatusTransitions {

        @Test
        void markCompleteChangesStatusToCompleted() {
            // Use interviewer message which starts as PENDING
            Message message = Message.interviewer("Test", sessionId, 1L);
            assertThat(message.getMessageStatus()).isEqualTo(MessageStatus.PENDING);

            message.markComplete();

            assertThat(message.getMessageStatus()).isEqualTo(MessageStatus.COMPLETED);
        }

        @Test
        void markFailedChangesStatusToFailed() {
            Message message = Message.interviewer("Test", sessionId, 1L);

            message.markFailed();

            assertThat(message.getMessageStatus()).isEqualTo(MessageStatus.FAILED);
        }
    }

    @Nested
    @DisplayName("Content manipulation")
    class ContentManipulation {

        @Test
        void appendDeltaAddsToContent() {
            Message message = Message.interviewer("Hello", sessionId, 1L);

            message.appendDelta(" world");

            assertThat(message.getContent()).isEqualTo("Hello world");
        }

        @Test
        void appendDeltaHandlesNullContent() {
            Message message = Message.builder()
                    .role(MessageRole.INTERVIEWER)
                    .sessionId(sessionId)
                    .seq(1L)
                    .messageStatus(MessageStatus.STREAMING)
                    .content(null)
                    .build();

            message.appendDelta("First delta");

            assertThat(message.getContent()).isEqualTo("First delta");
        }

        @Test
        void multipleAppendsAccumulate() {
            Message message = Message.interviewer("", sessionId, 1L);

            message.appendDelta("Hello");
            message.appendDelta(" ");
            message.appendDelta("world");
            message.appendDelta("!");

            assertThat(message.getContent()).isEqualTo("Hello world!");
        }
    }
}
