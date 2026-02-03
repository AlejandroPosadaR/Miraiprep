package com.example.aimock.speech.config;

import com.example.aimock.speech.provider.ElevenLabsTtsProvider;
import com.example.aimock.speech.provider.OpenAITtsProvider;
import com.example.aimock.speech.provider.TtsProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Configuration for TTS provider selection.
 * 
 * Selects which TTS provider to use based on the 'tts.provider' property.
 * Defaults to 'openai' if not specified.
 */
@Configuration
@Slf4j
public class TtsProviderConfig {

    @Value("${tts.provider:openai}")
    private String providerName;

    @Bean
    @Primary
    public TtsProvider ttsProvider(
            OpenAITtsProvider openAITtsProvider,
            ElevenLabsTtsProvider elevenLabsTtsProvider) {
        
        log.info("Configuring TTS provider: {}", providerName);
        
        return switch (providerName.toLowerCase()) {
            case "elevenlabs" -> {
                log.info("Using ElevenLabs TTS provider");
                yield elevenLabsTtsProvider;
            }
            case "openai" -> {
                log.info("Using OpenAI TTS provider");
                yield openAITtsProvider;
            }
            default -> {
                log.info("Using OpenAI TTS provider (default)");
                yield openAITtsProvider;
            }
        };
    }
}
