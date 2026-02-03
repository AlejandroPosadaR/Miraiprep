package com.example.aimock.speech.provider;

/**
 * Adapter interface for text-to-speech providers.
 * Allows switching between different TTS services (OpenAI, ElevenLabs, etc.)
 * without changing the rest of the codebase.
 */
public interface TtsProvider {
    
    /**
     * Synthesize text to speech.
     * 
     * @param text Text to speak
     * @param voice Voice identifier (provider-specific)
     * @param speed Speaking speed (0.25 to 4.0)
     * @return Audio data as byte array (MP3 format)
     */
    byte[] synthesize(String text, String voice, float speed);
    
    /**
     * Get the provider name for logging/identification.
     * @return Provider name (e.g., "openai", "elevenlabs")
     */
    String getProviderName();
}
