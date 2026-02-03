package com.example.aimock.ai;

import com.example.aimock.ai.strategy.DefaultInterviewStrategy;
import com.example.aimock.ai.strategy.InterviewStrategy;
import com.example.aimock.messages.model.Message;
import com.example.aimock.messages.model.MessageRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.ChatClient.ChatClientRequestSpec;
import org.springframework.ai.chat.client.ChatClient.CallResponseSpec;
import org.springframework.ai.chat.client.ChatClient.StreamResponseSpec;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import reactor.core.publisher.Flux;

import java.util.*;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AIChatService")
class AIChatServiceTest {

    @Mock
    private ChatClient.Builder chatClientBuilder;

    @Mock
    private ChatClient chatClient;

    @Mock
    private ChatClientRequestSpec requestSpec;

    @Mock
    private CallResponseSpec callResponseSpec;

    @Mock
    private StreamResponseSpec streamResponseSpec;

    @Mock
    private DefaultInterviewStrategy defaultStrategy;

    @Captor
    private ArgumentCaptor<List<org.springframework.ai.chat.messages.Message>> messagesCaptor;

    private AIChatService aiChatService;

    @BeforeEach
    void setUp() {
        when(chatClientBuilder.build()).thenReturn(chatClient);
        when(defaultStrategy.getInterviewType()).thenReturn("DEFAULT");
        when(defaultStrategy.buildSystemPrompt(anyString(), anyString())).thenReturn("System prompt");
        
        Map<String, InterviewStrategy> strategies = new HashMap<>();
        strategies.put("default", defaultStrategy);
        
        aiChatService = new AIChatService(chatClientBuilder, strategies, defaultStrategy);
    }

    private Message createUserMessage(String content, UUID sessionId, long seq) {
        return Message.builder()
                .id(UUID.randomUUID())
                .sessionId(sessionId)
                .seq(seq)
                .role(MessageRole.USER)
                .content(content)
                .build();
    }

    private Message createInterviewerMessage(String content, UUID sessionId, long seq) {
        return Message.builder()
                .id(UUID.randomUUID())
                .sessionId(sessionId)
                .seq(seq)
                .role(MessageRole.INTERVIEWER)
                .content(content)
                .build();
    }

    @Nested
    @DisplayName("generateResponse")
    class GenerateResponse {

        @BeforeEach
        void setUp() {
            when(chatClient.prompt()).thenReturn(requestSpec);
            when(requestSpec.system(anyString())).thenReturn(requestSpec);
            when(requestSpec.messages(anyList())).thenReturn(requestSpec);
            when(requestSpec.call()).thenReturn(callResponseSpec);
            when(callResponseSpec.content()).thenReturn("AI response");
        }

        @Test
        @DisplayName("should convert database messages to Spring AI message format")
        void convertsMessagesToSpringAIFormat() {
            UUID sessionId = UUID.randomUUID();
            List<Message> history = List.of(
                    createUserMessage("Hello", sessionId, 1L),
                    createInterviewerMessage("Hi there", sessionId, 2L)
            );

            aiChatService.generateResponse("TECHNICAL", history, "How are you?", 3, null);

            verify(requestSpec).messages(messagesCaptor.capture());
            List<org.springframework.ai.chat.messages.Message> captured = messagesCaptor.getValue();
            
            assertThat(captured).hasSize(3); // 2 history + 1 latest
            assertThat(captured.get(0)).isInstanceOf(UserMessage.class);
            assertThat(captured.get(1)).isInstanceOf(AssistantMessage.class);
            assertThat(captured.get(2)).isInstanceOf(UserMessage.class);
            
            // Verify content
            assertThat(captured.get(0).getText()).isEqualTo("Hello");
            assertThat(captured.get(1).getText()).isEqualTo("Hi there");
            assertThat(captured.get(2).getText()).isEqualTo("How are you?");
        }

        @Test
        @DisplayName("should limit conversation history to last 20 messages")
        void limitsHistoryToLast20Messages() {
            UUID sessionId = UUID.randomUUID();
            List<Message> history = new ArrayList<>();
            
            // Create 30 messages (15 user + 15 interviewer pairs)
            for (int i = 0; i < 30; i++) {
                if (i % 2 == 0) {
                    history.add(createUserMessage("User message " + i, sessionId, i + 1));
                } else {
                    history.add(createInterviewerMessage("Interviewer message " + i, sessionId, i + 1));
                }
            }

            aiChatService.generateResponse("TECHNICAL", history, "Latest message", 3, null);

            verify(requestSpec).messages(messagesCaptor.capture());
            List<org.springframework.ai.chat.messages.Message> captured = messagesCaptor.getValue();
            
            // Should have 20 (limited) + 1 (latest) = 21 messages
            assertThat(captured).hasSize(21);
            
            // First message should be from position 10 (30 - 20 = 10)
            assertThat(captured.get(0).getText()).isEqualTo("User message 10");
        }

        @Test
        @DisplayName("should handle empty conversation history")
        void handlesEmptyHistory() {
            aiChatService.generateResponse("TECHNICAL", Collections.emptyList(), "First message", 3, null);

            verify(requestSpec).messages(messagesCaptor.capture());
            List<org.springframework.ai.chat.messages.Message> captured = messagesCaptor.getValue();
            
            assertThat(captured).hasSize(1);
            assertThat(captured.get(0)).isInstanceOf(UserMessage.class);
            assertThat(captured.get(0).getText()).isEqualTo("First message");
        }

        @Test
        @DisplayName("should handle null response from AI")
        void handlesNullResponse() {
            when(callResponseSpec.content()).thenReturn(null);

            String response = aiChatService.generateResponse("TECHNICAL", Collections.emptyList(), "Test", 3, null);

            assertThat(response).isEmpty();
        }
    }

    @Nested
    @DisplayName("streamResponse")
    class StreamResponse {

        @BeforeEach
        void setUp() {
            when(chatClient.prompt()).thenReturn(requestSpec);
            when(requestSpec.system(anyString())).thenReturn(requestSpec);
            when(requestSpec.messages(anyList())).thenReturn(requestSpec);
            when(requestSpec.stream()).thenReturn(streamResponseSpec);
        }

        @Test
        @DisplayName("should use native message format for streaming")
        void usesNativeMessageFormatForStreaming() {
            UUID sessionId = UUID.randomUUID();
            List<Message> history = List.of(
                    createUserMessage("Hello", sessionId, 1L),
                    createInterviewerMessage("Hi", sessionId, 2L)
            );
            when(streamResponseSpec.content()).thenReturn(Flux.just("Hello", " ", "world"));

            aiChatService.streamResponse("TECHNICAL", history, "Latest", 3, null);

            verify(requestSpec).messages(messagesCaptor.capture());
            List<org.springframework.ai.chat.messages.Message> captured = messagesCaptor.getValue();
            
            assertThat(captured).hasSize(3);
            assertThat(captured.get(0)).isInstanceOf(UserMessage.class);
            assertThat(captured.get(1)).isInstanceOf(AssistantMessage.class);
            assertThat(captured.get(2)).isInstanceOf(UserMessage.class);
        }

        @Test
        @DisplayName("should limit history to 20 messages for streaming")
        void limitsHistoryForStreaming() {
            UUID sessionId = UUID.randomUUID();
            List<Message> history = IntStream.range(0, 25)
                    .mapToObj(i -> i % 2 == 0 
                            ? createUserMessage("Msg " + i, sessionId, i + 1)
                            : createInterviewerMessage("Resp " + i, sessionId, i + 1))
                    .toList();
            
            when(streamResponseSpec.content()).thenReturn(Flux.just("Response"));

            aiChatService.streamResponse("TECHNICAL", history, "New msg", 3, null);

            verify(requestSpec).messages(messagesCaptor.capture());
            List<org.springframework.ai.chat.messages.Message> captured = messagesCaptor.getValue();
            
            // 20 (limited) + 1 (latest) = 21
            assertThat(captured).hasSize(21);
        }
    }

    @Nested
    @DisplayName("message role conversion")
    class MessageRoleConversion {

        @BeforeEach
        void setUp() {
            when(chatClient.prompt()).thenReturn(requestSpec);
            when(requestSpec.system(anyString())).thenReturn(requestSpec);
            when(requestSpec.messages(anyList())).thenReturn(requestSpec);
            when(requestSpec.call()).thenReturn(callResponseSpec);
            when(callResponseSpec.content()).thenReturn("Response");
        }

        @Test
        @DisplayName("should convert USER role to UserMessage")
        void convertsUserRoleToUserMessage() {
            UUID sessionId = UUID.randomUUID();
            List<Message> history = List.of(createUserMessage("User content", sessionId, 1L));

            aiChatService.generateResponse("TECHNICAL", history, "Latest", 3, null);

            verify(requestSpec).messages(messagesCaptor.capture());
            List<org.springframework.ai.chat.messages.Message> captured = messagesCaptor.getValue();
            
            assertThat(captured.get(0)).isInstanceOf(UserMessage.class);
        }

        @Test
        @DisplayName("should convert INTERVIEWER role to AssistantMessage")
        void convertsInterviewerRoleToAssistantMessage() {
            UUID sessionId = UUID.randomUUID();
            List<Message> history = List.of(createInterviewerMessage("AI content", sessionId, 1L));

            aiChatService.generateResponse("TECHNICAL", history, "Latest", 3, null);

            verify(requestSpec).messages(messagesCaptor.capture());
            List<org.springframework.ai.chat.messages.Message> captured = messagesCaptor.getValue();
            
            assertThat(captured.get(0)).isInstanceOf(AssistantMessage.class);
        }
    }
}
