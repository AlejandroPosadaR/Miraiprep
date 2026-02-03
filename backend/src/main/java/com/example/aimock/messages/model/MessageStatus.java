package com.example.aimock.messages.model;

/**
 * Status of a message in an interview session.
 */
public enum MessageStatus {
    /**
     * Message is waiting to be processed (e.g., interviewer placeholder before AI starts).
     */
    PENDING,
    
    /**
     * Message is currently being streamed (AI is generating tokens).
     */
    STREAMING,
    
    /**
     * Message has been fully delivered.
     */
    COMPLETED,
    
    /**
     * Message processing failed.
     */
    FAILED
}
