package com.example.aimock.messages.events;

import com.example.aimock.messages.SQSService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiJobRequestedListener {

    private final SQSService sqsService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(AiJobRequestedEvent event) {
        log.debug("After-commit enqueue: interviewerMessageId={}, sessionId={}",
                event.interviewerMessageId(), event.sessionId());
        sqsService.enqueueMessageJob(
                event.interviewerMessageId(),
                event.sessionId(),
                event.userContent()
        );
    }
}

