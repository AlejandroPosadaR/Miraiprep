package com.example.aimock.websocket;

import com.example.aimock.exception.MessageLimitExceededException;
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

    @MessageMapping("/interview/send")
    public void sendMessage(@Valid @Payload InterviewMessageRequest req) {
        log.debug("STOMP message: sessionId={}, userId={}", req.getSessionId(), req.getUserId());
        try {
            MessageCreationResult result = messageService.createUserMessageAndEnqueue(
                    req.getSessionId(),
                    req.getUserId(),
                    req.getContent(),
                    req.getIdempotencyKey()
            );
            topicPublisher.accepted(req.getSessionId(), result.getUserMessageId(), result.getInterviewerMessageId());
        } catch (MessageLimitExceededException e) {
            log.warn("Message limit exceeded for user in session: sessionId={}, userId={}", 
                    req.getSessionId(), req.getUserId());
            topicPublisher.messageLimitExceeded(
                    req.getSessionId(),
                    e.getMessageLimit(),
                    e.getMessageCount(),
                    e.getTier()
            );
        }
    }
}
