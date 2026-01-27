package com.example.aimock.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIProcessingResult {
    
    private UUID interviewerMessageId;
    private UUID sessionId;
    private String aiResponse;
    private Status status;
    private String errorMessage;

    public enum Status {
        SUCCESS,
        FAILED,
        RETRY
    }
}
