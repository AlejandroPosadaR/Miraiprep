package com.example.aimock.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request DTO for AI message processing jobs (typically from SQS).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIProcessingRequest {
    
    /** The placeholder message ID that will be updated with AI response */
    private UUID interviewerMessageId;
    
    /** The interview session ID */
    private UUID sessionId;
    
    /** The user's message content that triggered this AI response */
    private String userContent;
    
    /** Optional: retry attempt number */
    private Integer retryCount;
}
