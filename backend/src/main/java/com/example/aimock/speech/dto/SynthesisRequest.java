package com.example.aimock.speech.dto;

import jakarta.validation.constraints.NotBlank;

public record SynthesisRequest(
        @NotBlank String text,
        String voice, // "alloy", "echo", "fable", "onyx", "nova", "shimmer"
        Float speed,  // 0.5 to 1.5, default 1.0
        Integer sequenceNumber, // Optional: for ordering audio chunks
        String messageId // Optional: to group chunks for a specific message
) {
}
