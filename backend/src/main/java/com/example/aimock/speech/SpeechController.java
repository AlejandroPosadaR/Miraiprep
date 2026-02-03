package com.example.aimock.speech;

import com.example.aimock.speech.dto.TranscriptionRequest;
import com.example.aimock.speech.dto.TranscriptionResponse;
import com.example.aimock.speech.dto.SynthesisRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * REST controller for speech-to-text (STT) and text-to-speech (TTS) operations.
 * 
 * Uses OpenAI Whisper API for transcription and OpenAI TTS for synthesis.
 * Provides much better quality than browser Web Speech API.
 */
@RestController
@RequestMapping("/api/v1/speech")
@RequiredArgsConstructor
@Slf4j
public class SpeechController {

    private final SpeechService speechService;

    /**
     * Transcribe audio to text using OpenAI Whisper API.
     * 
     * @param file Audio file (webm, mp3, wav, etc.)
     * @param language Optional language code (e.g., "en")
     * @return Transcription result
     */
    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TranscriptionResponse> transcribe(
            @RequestParam("audio") MultipartFile file,
            @RequestParam(value = "language", required = false) String language,
            @AuthenticationPrincipal com.example.aimock.auth.user.AuthUser user) {
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(TranscriptionResponse.error("Audio file is required"));
        }

        try {
            log.debug("Transcribing audio: size={} bytes, language={}, user={}", 
                    file.getSize(), language, user != null ? user.getEmail() : "anonymous");
            
            String transcript = speechService.transcribe(file.getInputStream(), 
                    file.getContentType(), language);
            
            return ResponseEntity.ok(TranscriptionResponse.success(transcript));
        } catch (IOException e) {
            log.error("Failed to read audio file", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(TranscriptionResponse.error("Failed to process audio file: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Transcription failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(TranscriptionResponse.error("Transcription failed: " + e.getMessage()));
        }
    }

    /**
     * Synthesize text to speech using OpenAI TTS API.
     * 
     * @param request TTS request with text, voice, speed, and optional sequence number
     * @return Audio file (MP3) with sequence headers for ordering
     */
    @PostMapping(value = "/synthesize", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<byte[]> synthesize(
            @RequestBody SynthesisRequest request,
            @AuthenticationPrincipal com.example.aimock.auth.user.AuthUser user) {
        
        if (request.text() == null || request.text().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            log.debug("Synthesizing speech: textLength={}, voice={}, speed={}, seq={}, msgId={}, user={}", 
                    request.text().length(), request.voice(), request.speed(),
                    request.sequenceNumber(), request.messageId(),
                    user != null ? user.getEmail() : "anonymous");
            
            byte[] audioData = speechService.synthesize(
                    request.text(),
                    request.voice() != null ? request.voice() : "alloy",
                    request.speed() != null ? request.speed() : 1.0f
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("audio/mpeg"));
            headers.setContentLength(audioData.length);
            headers.setContentDispositionFormData("attachment", "speech.mp3");
            
            // Add sequence headers for client-side ordering
            if (request.sequenceNumber() != null) {
                headers.add("X-Audio-Sequence", String.valueOf(request.sequenceNumber()));
            }
            if (request.messageId() != null) {
                headers.add("X-Message-Id", request.messageId());
            }
            // Expose custom headers to frontend
            headers.add("Access-Control-Expose-Headers", "X-Audio-Sequence, X-Message-Id");
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(audioData);
        } catch (Exception e) {
            log.error("Speech synthesis failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
