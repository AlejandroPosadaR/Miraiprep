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
 * ElevenLabs TTS provider adapter.
 * Implements TTS using ElevenLabs API.
 * 
 * Note: Voice IDs need to be mapped from OpenAI voice names to ElevenLabs voice IDs.
 * Common ElevenLabs voice IDs:
 * - Rachel: 21m00Tcm4TlvDq8ikWAM
 * - Domi: AZnzlk1XvdvUeBnXmlld
 * - Bella: EXAVITQu4vr4xnSDxMaL
 * - Elli: MF3mGyEYCl7XYWbV9V6O
 * - Josh: TxGEqnHWrfWFTfGW9XjX
 * - Arnold: VR6AewLTigWG4xSOukaG
 * - Adam: pNInz6obpgDQGcFmaJgB
 * - Sam: yoZ06aMxZJJ28mfd3POQ
 */
@Component("elevenlabsTtsProvider")
@RequiredArgsConstructor
@Slf4j
public class ElevenLabsTtsProvider implements TtsProvider {

    private final RestTemplate restTemplate;

    @Value("${elevenlabs.api-key:}")
    private String apiKey;

    private static final String TTS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}";
    
    // Default voice ID mapping (OpenAI voice name -> ElevenLabs voice ID)
    private static final Map<String, String> VOICE_MAPPING = Map.of(
        "alloy", "pNInz6obpgDQGcFmaJgB",  // Adam
        "echo", "21m00Tcm4TlvDq8ikWAM",    // Rachel
        "fable", "AZnzlk1XvdvUeBnXmlld",   // Domi
        "onyx", "TxGEqnHWrfWFTfGW9XjX",    // Josh
        "nova", "EXAVITQu4vr4xnSDxMaL",    // Bella
        "shimmer", "MF3mGyEYCl7XYWbV9V6O"  // Elli
    );

    @Override
    public byte[] synthesize(String text, String voice, float speed) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new RuntimeException("ElevenLabs API key not configured. Set 'elevenlabs.api-key' property.");
        }

        // Map OpenAI voice name to ElevenLabs voice ID
        String voiceId = mapVoiceToElevenLabsId(voice != null ? voice : "alloy");

        HttpHeaders headers = new HttpHeaders();
        headers.set("xi-api-key", apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("text", text);
        requestBody.put("model_id", "eleven_multilingual_v2");
        
        // Voice settings
        Map<String, Object> voiceSettings = new HashMap<>();
        voiceSettings.put("stability", 0.5);
        voiceSettings.put("similarity_boost", 0.75);
        voiceSettings.put("style", 0.0);
        voiceSettings.put("use_speaker_boost", true);
        requestBody.put("voice_settings", voiceSettings);
        
        // Note: ElevenLabs API doesn't support direct speed parameter in the request.
        // Speed is typically controlled via model selection or post-processing.
        // We accept the speed parameter for API compatibility but it won't affect the output.
        // If speed control is needed, consider using a different model or post-processing.

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);

        try {
            log.debug("ElevenLabs TTS: textLength={}, voice={} (mapped to {}), speed={}", 
                    text.length(), voice, voiceId, speed);
            
            ResponseEntity<byte[]> response = restTemplate.exchange(
                    TTS_API_URL,
                    HttpMethod.POST,
                    requestEntity,
                    byte[].class,
                    voiceId
            );

            return response.getBody();
        } catch (Exception e) {
            log.error("ElevenLabs TTS API error", e);
            throw new RuntimeException("Speech synthesis failed: " + e.getMessage(), e);
        }
    }

    private String mapVoiceToElevenLabsId(String openAiVoice) {
        return VOICE_MAPPING.getOrDefault(openAiVoice.toLowerCase(), VOICE_MAPPING.get("alloy"));
    }

    @Override
    public String getProviderName() {
        return "elevenlabs";
    }
}
