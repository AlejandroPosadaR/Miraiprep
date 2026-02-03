import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/services/api";

export type OpenAITextToSpeechState = {
  isSupported: boolean;
  isSpeaking: boolean;
  error: string | null;
};

export type OpenAITextToSpeechControls = {
  speak: (text: string, options?: { voice?: string; speed?: number }) => void;
  cancel: () => void;
};

export type UseOpenAITextToSpeechOptions = {
  /** Default voice: "alloy", "echo", "fable", "onyx", "nova", "shimmer" */
  defaultVoice?: string;
  /** Default speed: 0.25 to 4.0 */
  defaultSpeed?: number;
  /** Called when speech starts */
  onStart?: () => void;
  /** Called when speech ends */
  onEnd?: () => void;
  /** Called on error */
  onError?: (error: string) => void;
};

/**
 * Text-to-speech using OpenAI TTS API via backend.
 * 
 * This provides much better quality than Web Speech Synthesis API.
 * 
 * Flow:
 * 1. Send text to backend
 * 2. Backend calls OpenAI TTS API
 * 3. Receive MP3 audio blob
 * 4. Play audio in browser
 */
export function useOpenAITextToSpeech(
  options: UseOpenAITextToSpeechOptions = {}
): OpenAITextToSpeechState & OpenAITextToSpeechControls {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSupported = typeof Audio !== "undefined";

  const speak = useCallback(
    async (text: string, speakOptions?: { voice?: string; speed?: number }) => {
      if (!isSupported || !text.trim()) return;

      setError(null);

      try {
        // Cancel any ongoing speech
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // Get audio from backend
        const audioBlob = await api.textToSpeech(text, {
          voice: speakOptions?.voice || options.defaultVoice || "alloy",
          speed: speakOptions?.speed || options.defaultSpeed || 1.0,
        });

        // Create audio element and play
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          setIsSpeaking(true);
          options.onStart?.();
        };

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          options.onEnd?.();
        };

        audio.onerror = (e) => {
          const errMsg = "Failed to play audio";
          setError(errMsg);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          options.onError?.(errMsg);
        };

        await audio.play();
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "TTS failed";
        setError(errorMsg);
        setIsSpeaking(false);
        options.onError?.(errorMsg);
      }
    },
    [isSupported, options]
  );

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      if (audioRef.current.src.startsWith("blob:")) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    isSupported,
    isSpeaking,
    error,
    speak,
    cancel,
  };
}
