package com.example.aimock.websocket;

import com.example.aimock.websocket.dto.SessionTopicEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Small wrapper around SimpMessagingTemplate to publish session-scoped events.
 */
@Component
@RequiredArgsConstructor
public class SessionTopicPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publish(SessionTopicEvent event) {
        String topic = "/topic/session/" + event.sessionId();
        messagingTemplate.convertAndSend(topic, event);
    }

    public void accepted(UUID sessionId, UUID userMessageId, UUID interviewerMessageId) {
        publish(SessionTopicEvent.accepted(sessionId, userMessageId, interviewerMessageId));
    }

    public void aiDelta(UUID sessionId, UUID interviewerMessageId, String delta) {
        publish(SessionTopicEvent.aiDelta(sessionId, interviewerMessageId, delta));
    }

    public void aiComplete(UUID sessionId, UUID interviewerMessageId, String content) {
        publish(SessionTopicEvent.aiComplete(sessionId, interviewerMessageId, content));
    }

    public void aiFailed(UUID sessionId, UUID interviewerMessageId, String error) {
        publish(SessionTopicEvent.aiFailed(sessionId, interviewerMessageId, error));
    }
}

