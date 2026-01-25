package com.example.aimock.websocket;

import com.example.aimock.messages.dto.MessageCreationResult;
import com.example.aimock.messages.MessageService;
import com.example.aimock.websocket.dto.InterviewMessageRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
@Slf4j
public class InterviewStompController {

    private final MessageService messageService;
    private final SessionTopicPublisher topicPublisher;

    /**
     * Client sends to /app/interview/send with payload InterviewMessageRequest.
     * Creates user message, enqueues AI job, sends ack to /topic/session/{sessionId}.
     */
    @MessageMapping("/interview/send")
    public void sendMessage(@Valid @Payload InterviewMessageRequest req) {
        log.debug("STOMP message: sessionId={}, userId={}", req.getSessionId(), req.getUserId());
        MessageCreationResult result = messageService.createUserMessageAndEnqueue(
                req.getSessionId(),
                req.getUserId(),
                req.getContent(),
                req.getIdempotencyKey()
        );
        topicPublisher.accepted(req.getSessionId(), result.getUserMessageId(), result.getInterviewerMessageId());
    }
}
