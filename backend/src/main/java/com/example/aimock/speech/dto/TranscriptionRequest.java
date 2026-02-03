package com.example.aimock.speech.dto;

import jakarta.validation.constraints.NotBlank;

public record TranscriptionRequest(
        @NotBlank String audioBase64,
        String language
) {
}
