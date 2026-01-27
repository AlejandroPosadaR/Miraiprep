package com.example.aimock.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIProcessingRequest {
    
    private UUID interviewerMessageId;
    private UUID sessionId;
    private String userContent;
    private Integer retryCount;
}
