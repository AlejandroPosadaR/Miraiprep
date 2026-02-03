package com.example.aimock.speech.provider;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * OpenAI TTS provider adapter.
 * Implements TTS using OpenAI's text-to-speech API.
 */
@Component("openaiTtsProvider")
@RequiredArgsConstructor
@Slf4j
public class OpenAITtsProvider implements TtsProvider {

    private final RestTemplate restTemplate;

    @Value("${spring.ai.openai.api-key}")
    private String apiKey;

    private static final String TTS_API_URL = "https://api.openai.com/v1/audio/speech";

    @Override
    public byte[] synthesize(String text, String voice, float speed) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "tts-1");
        requestBody.put("input", text);
        requestBody.put("voice", voice != null ? voice : "alloy");
        requestBody.put("speed", Math.max(0.25f, Math.min(4.0f, speed)));

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);

        try {
            log.debug("OpenAI TTS: textLength={}, voice={}, speed={}", 
                    text.length(), voice, speed);
            
            ResponseEntity<byte[]> response = restTemplate.exchange(
                    TTS_API_URL,
                    HttpMethod.POST,
                    requestEntity,
                    byte[].class
            );

            return response.getBody();
        } catch (Exception e) {
            log.error("OpenAI TTS API error", e);
            throw new RuntimeException("Speech synthesis failed: " + e.getMessage(), e);
        }
    }

    @Override
    public String getProviderName() {
        return "openai";
    }
}
