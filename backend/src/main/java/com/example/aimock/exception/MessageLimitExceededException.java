package com.example.aimock.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception thrown when a user has exceeded their message limit.
 */
@ResponseStatus(HttpStatus.PAYMENT_REQUIRED)
public class MessageLimitExceededException extends RuntimeException {
    
    private final int messageLimit;
    private final int messageCount;
    private final String tier;

    public MessageLimitExceededException(int messageLimit, int messageCount, String tier) {
        super(String.format(
            "Message limit exceeded. You have used %d of %d messages on the %s tier. " +
            "Please upgrade your plan to continue.",
            messageCount, messageLimit, tier
        ));
        this.messageLimit = messageLimit;
        this.messageCount = messageCount;
        this.tier = tier;
    }

    public int getMessageLimit() {
        return messageLimit;
    }

    public int getMessageCount() {
        return messageCount;
    }

    public String getTier() {
        return tier;
    }
}
