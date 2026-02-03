package com.example.aimock.websocket;

import com.example.aimock.websocket.dto.SessionTopicEvent;
import io.micrometer.core.instrument.Counter;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class SessionTopicPublisher {

    private final SimpMessagingTemplate messagingTemplate;
    private final Counter websocketMessagesSent;

    public void publish(SessionTopicEvent event) {
        String topic = "/topic/session/" + event.sessionId();
        messagingTemplate.convertAndSend(topic, event);
        // Track WebSocket messages sent
        websocketMessagesSent.increment();
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

