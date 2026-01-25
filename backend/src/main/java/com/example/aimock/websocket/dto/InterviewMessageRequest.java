package com.example.aimock.websocket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InterviewMessageRequest {

    @NotNull
    private UUID sessionId;

    @NotNull
    private UUID userId;

    @NotBlank
    private String content;

    /** Optional idempotency key to avoid duplicate processing. */
    private String idempotencyKey;
}
