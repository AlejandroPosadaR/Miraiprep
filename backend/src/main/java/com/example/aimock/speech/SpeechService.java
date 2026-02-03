package com.example.aimock.speech;

import com.example.aimock.speech.provider.TtsProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Service for speech-to-text and text-to-speech.
 * 
 * Uses OpenAI Whisper API for transcription.
 * Uses TTS provider adapter pattern for text-to-speech (supports OpenAI, ElevenLabs, etc.).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SpeechService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final TtsProvider ttsProvider;

    @Value("${spring.ai.openai.api-key}")
    private String apiKey;

    private static final String WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";

    /**
     * Transcribe audio using OpenAI Whisper API.
     */
    public String transcribe(InputStream audioStream, String contentType, String language) throws IOException {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        // Don't set Content-Type header - Spring will set it with boundary for multipart

        // Create multipart request
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        
        // Convert InputStream to byte array for multipart
        byte[] audioBytes = audioStream.readAllBytes();
        if (audioBytes.length == 0) {
            throw new RuntimeException("Audio file is empty");
        }
        if (audioBytes.length < 100) {
            log.warn("Audio file is very small: {} bytes, might be invalid", audioBytes.length);
        }

        // Resolve content type and filename
        String resolvedContentType = (contentType == null || contentType.isBlank())
                ? "audio/webm"
                : contentType;
        String filename = resolveFilename(resolvedContentType);
        
        // Validate file format
        if (!isValidAudioFormat(audioBytes, resolvedContentType)) {
            log.warn("Audio file might be in unsupported format. First bytes: {}", 
                    bytesToHex(audioBytes, Math.min(20, audioBytes.length)));
        }
        
        log.debug("Transcribing audio: size={} bytes, contentType={}, filename={}", 
                audioBytes.length, resolvedContentType, filename);

        // Create ByteArrayResource with proper filename
        ByteArrayResource audioResource = new ByteArrayResource(audioBytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        // Wrap in HttpEntity with explicit Content-Type for the file part
        // OpenAI requires proper Content-Type headers in multipart
        HttpHeaders fileHeaders = new HttpHeaders();
        fileHeaders.setContentType(MediaType.parseMediaType(resolvedContentType));
        HttpEntity<ByteArrayResource> fileEntity = new HttpEntity<>(audioResource, fileHeaders);

        // Add file part - Spring will handle multipart encoding
        // The filename extension is what OpenAI uses to detect format
        body.add("file", fileEntity);
        body.add("model", "whisper-1");
        if (language != null && !language.isEmpty()) {
            body.add("language", language);
        }
        body.add("response_format", "json");

        HttpEntity<MultiValueMap<String, Object>> requestEntity = 
                new HttpEntity<>(body, headers);

        try {
            log.debug("Sending transcription request to OpenAI: filename={}, language={}", filename, language);
            ResponseEntity<String> response = restTemplate.exchange(
                    WHISPER_API_URL,
                    HttpMethod.POST,
                    requestEntity,
                    String.class
            );

            JsonNode json = objectMapper.readTree(response.getBody());
            String transcript = json.path("text").asText();
            log.debug("Transcription successful: transcriptLength={}", transcript != null ? transcript.length() : 0);
            return transcript;
        } catch (Exception e) {
            log.error("OpenAI Whisper API error: contentType={}, filename={}", resolvedContentType, filename, e);
            throw new RuntimeException("Transcription failed: " + e.getMessage(), e);
        }
    }

    private String resolveFilename(String contentType) {
        if (contentType == null) {
            return "audio.webm";
        }
        String lower = contentType.toLowerCase();
        if (lower.contains("webm")) return "audio.webm";
        if (lower.contains("mpeg") || lower.contains("mp3") || lower.contains("mpga")) return "audio.mp3";
        if (lower.contains("mp4") || lower.contains("m4a")) return "audio.m4a";
        if (lower.contains("ogg") || lower.contains("oga")) return "audio.ogg";
        if (lower.contains("wav")) return "audio.wav";
        if (lower.contains("flac")) return "audio.flac";
        log.warn("Unknown content type: {}, defaulting to webm", contentType);
        return "audio.webm";
    }

    private boolean isValidAudioFormat(byte[] bytes, String contentType) {
        if (bytes.length < 4) return false;
        
        // Check file signatures (magic bytes) first, regardless of content type
        // WebM/Matroska files start with 0x1A 0x45 0xDF 0xA3
        if (bytes[0] == 0x1A && bytes[1] == 0x45 && bytes[2] == 0xDF && bytes[3] == (byte)0xA3) {
            return true; // Valid WebM/Matroska
        }
        
        // WAV files start with "RIFF"
        if (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F') {
            return true; // Valid WAV
        }
        
        // MP3 files can start with ID3 tag (0x49 0x44 0x33) or frame sync (0xFF 0xFB or 0xFF 0xF3)
        if (bytes.length >= 3 && bytes[0] == 0x49 && bytes[1] == 0x44 && bytes[2] == 0x33) {
            return true; // Valid MP3 with ID3 tag
        }
        if (bytes.length >= 2 && bytes[0] == (byte)0xFF && (bytes[1] == (byte)0xFB || bytes[1] == (byte)0xF3)) {
            return true; // Valid MP3 frame sync
        }
        
        // M4A/MP4 files have ftyp box at offset 4
        if (bytes.length >= 8 && bytes[4] == 'f' && bytes[5] == 't' && bytes[6] == 'y' && bytes[7] == 'p') {
            return true; // Valid M4A/MP4
        }
        
        // OGG files start with "OggS"
        if (bytes.length >= 4 && bytes[0] == 'O' && bytes[1] == 'g' && bytes[2] == 'g' && bytes[3] == 'S') {
            return true; // Valid OGG
        }
        
        // FLAC files start with "fLaC"
        if (bytes.length >= 4 && bytes[0] == 'f' && bytes[1] == 'L' && bytes[2] == 'a' && bytes[3] == 'C') {
            return true; // Valid FLAC
        }
        
        // If no signature matches but we have a valid content type, assume it's valid
        // OpenAI Whisper can handle various formats, so we're lenient here
        if (contentType != null && !contentType.isBlank()) {
            return true;
        }
        
        // Unknown format - might still work, but log warning
        return false;
    }

    private String bytesToHex(byte[] bytes, int length) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < Math.min(length, bytes.length); i++) {
            sb.append(String.format("%02X ", bytes[i]));
        }
        return sb.toString().trim();
    }

    /**
     * Synthesize text to speech using the configured TTS provider.
     * 
     * @param text Text to speak
     * @param voice Voice identifier (provider-specific)
     * @param speed Speed: 0.25 to 4.0
     * @return Audio data as byte array (MP3)
     */
    public byte[] synthesize(String text, String voice, float speed) {
        log.debug("Synthesizing speech using {} provider: textLength={}, voice={}, speed={}", 
                ttsProvider.getProviderName(), text.length(), voice, speed);
        
        return ttsProvider.synthesize(text, voice, speed);
    }
}
