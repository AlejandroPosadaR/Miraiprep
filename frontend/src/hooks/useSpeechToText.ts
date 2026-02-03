import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechRecognitionConstructor = new () => SpeechRecognition;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechToTextState = {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
};

export type SpeechToTextControls = {
  start: () => void;
  stop: () => void;
  reset: () => void;
};

export type UseSpeechToTextOptions = {
  lang?: string; // e.g. "en-US"
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
};

/**
 * Browser speech-to-text via the Web Speech API.
 *
 * Notes:
 * - Works best in Chromium browsers.
 * - Safari uses `webkitSpeechRecognition` and may behave differently.
 * - Requires microphone permissions from the browser.
 */
export function useSpeechToText(options: UseSpeechToTextOptions = {}): SpeechToTextState & SpeechToTextControls {
  const RecognitionCtor = useMemo(() => getSpeechRecognitionConstructor(), []);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isSupported = !!RecognitionCtor;

  const ensureRecognition = useCallback(() => {
    if (!RecognitionCtor) return null;
    if (recognitionRef.current) return recognitionRef.current;

    const r = new RecognitionCtor();
    r.lang = options.lang ?? "en-US";
    r.continuous = options.continuous ?? true;
    r.interimResults = options.interimResults ?? true;
    r.maxAlternatives = options.maxAlternatives ?? 1;

    r.onstart = () => {
      setError(null);
      setIsListening(true);
    };
    r.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };
    r.onerror = (evt) => {
      // Common: "not-allowed", "service-not-allowed", "no-speech", "audio-capture"
      setError(evt.error ?? "speech_recognition_error");
      setIsListening(false);
    };
    r.onresult = (evt) => {
      let interim = "";
      let finalText = "";
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        const res = evt.results[i];
        const text = res[0]?.transcript ?? "";
        if (res.isFinal) finalText += text;
        else interim += text;
      }

      console.debug("STT result:", { interim, finalText });
      if (interim) setInterimTranscript(interim.trim());
      if (finalText) setFinalTranscript((prev) => (prev ? `${prev} ${finalText.trim()}` : finalText.trim()));
    };

    recognitionRef.current = r;
    return r;
  }, [RecognitionCtor, options.continuous, options.interimResults, options.lang, options.maxAlternatives]);

  const start = useCallback(() => {
    setError(null);
    const r = ensureRecognition();
    if (!r) {
      console.warn("SpeechRecognition not available");
      return;
    }
    try {
      // Stop any existing recognition first
      try {
        r.stop();
      } catch {
        // ignore
      }
      // Small delay to ensure previous session is fully stopped
      setTimeout(() => {
        try {
          r.start();
          console.debug("SpeechRecognition started");
        } catch (e) {
          console.error("Failed to start SpeechRecognition:", e);
          setError(e instanceof Error ? e.message : "failed_to_start_recognition");
          setIsListening(false);
        }
      }, 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed_to_start_recognition");
      setIsListening(false);
    }
  }, [ensureRecognition]);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    try {
      r.stop();
    } catch {
      // ignore
    }
  }, []);

  const reset = useCallback(() => {
    setInterimTranscript("");
    setFinalTranscript("");
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount to avoid mic being held.
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    finalTranscript,
    error,
    start,
    stop,
    reset,
  };
}

