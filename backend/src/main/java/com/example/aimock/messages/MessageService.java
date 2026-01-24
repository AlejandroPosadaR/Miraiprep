package com.example.aimock.messages;

import com.example.aimock.messages.model.Message;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;

    /**
     * Returns all messages for a session (both USER and INTERVIEWER).
     * Ordered by sequence number.
     */
    public List<Message> getMessages(UUID sessionId, Long cursorSeq, Integer limit) {
        List<Message> all = messageRepository.findBySessionIdOrderBySeqAsc(sessionId);
        // TODO: apply cursorSeq and limit when pagination is implemented
        return all;
    }
}
