import { useCallback, useState } from "react";
import { useSpeechToText, type SpeechToTextState, type SpeechToTextControls } from "./useSpeechToText";
import { useOpenAISpeechToText } from "./useOpenAISpeechToText";

export type HybridSpeechToTextState = SpeechToTextState & {
  provider: "openai" | "web-speech" | "none";
  isProcessing: boolean;
};

export type HybridSpeechToTextControls = SpeechToTextControls;

export type UseHybridSpeechToTextOptions = {
  /** Preferred provider: "openai" (better quality) or "web-speech" (free, offline) */
  preferredProvider?: "openai" | "web-speech" | "auto";
  /** Language code, e.g. "en-US" */
  lang?: string;
};

/**
 * Hybrid speech-to-text hook that tries OpenAI first, falls back to Web Speech API.
 * 
 * This gives you the best of both worlds:
 * - OpenAI: Better accuracy, works everywhere
 * - Web Speech API: Free, works offline, no API costs
 */
export function useHybridSpeechToText(
  options: UseHybridSpeechToTextOptions = {}
): HybridSpeechToTextState & HybridSpeechToTextControls {
  const { preferredProvider = "auto" } = options;

  const webSpeech = useSpeechToText({
    lang: options.lang,
    continuous: true,
    interimResults: true,
  });

  const openai = useOpenAISpeechToText({
    lang: options.lang?.split("-")[0], // "en-US" -> "en"
  });

  // Determine which provider to use
  const provider: "openai" | "web-speech" | "none" =
    preferredProvider === "openai"
      ? openai.isSupported
        ? "openai"
        : webSpeech.isSupported
          ? "web-speech"
          : "none"
      : preferredProvider === "web-speech"
        ? webSpeech.isSupported
          ? "web-speech"
          : "none"
        : openai.isSupported
          ? "openai"
          : webSpeech.isSupported
            ? "web-speech"
            : "none";

  const active = provider === "openai" ? openai : provider === "web-speech" ? webSpeech : null;

  const start = useCallback(() => {
    if (provider === "openai") {
      openai.start();
    } else if (provider === "web-speech") {
      webSpeech.start();
    }
  }, [provider, openai, webSpeech]);

  const stop = useCallback(() => {
    if (provider === "openai") {
      openai.stop();
    } else if (provider === "web-speech") {
      webSpeech.stop();
    }
  }, [provider, openai, webSpeech]);

  const reset = useCallback(() => {
    if (provider === "openai") {
      openai.reset();
    } else if (provider === "web-speech") {
      webSpeech.reset();
    }
  }, [provider, openai, webSpeech]);

  return {
    isSupported: provider !== "none",
    isListening: active?.isListening ?? false,
    interimTranscript: active?.interimTranscript ?? "",
    finalTranscript: active?.finalTranscript ?? active?.transcript ?? "",
    error: active?.error ?? null,
    provider,
    isProcessing: provider === "openai" ? openai.isProcessing : false,
    start,
    stop,
    reset,
  };
}
