package com.example.aimock.speech.dto;

public record TranscriptionResponse(
        boolean success,
        String text,
        String error
) {
    public static TranscriptionResponse success(String text) {
        return new TranscriptionResponse(true, text, null);
    }

    public static TranscriptionResponse error(String error) {
        return new TranscriptionResponse(false, null, error);
    }
}
