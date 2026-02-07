package com.example.aimock.auth.dto;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private UUID userId;
    private String email;
    private String username;
    private String firstName;
    private String lastName;
    private String message;
    
    // Message limit info
    private String tier;
    private Integer messageCount;
    private Integer messageLimit;
    private Integer remainingMessages;
}

