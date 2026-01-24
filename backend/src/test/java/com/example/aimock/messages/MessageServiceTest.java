package com.example.aimock.messages;

import com.example.aimock.messages.model.Message;
import com.example.aimock.messages.model.MessageRole;
import com.example.aimock.messages.model.MessageStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock
    private MessageRepository messageRepository;

    private MessageService messageService;

    private UUID sessionId;

    @BeforeEach
    void setUp() {
        messageService = new MessageService(messageRepository);
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
}
