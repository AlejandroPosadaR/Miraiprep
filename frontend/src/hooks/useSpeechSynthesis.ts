import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SpeechSynthesisState = {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  error: string | null;
};

export type SpeechSynthesisControls = {
  speak: (text: string) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  setVoice: (voice: SpeechSynthesisVoice) => void;
};

export type UseSpeechSynthesisOptions = {
  /** Language code, e.g. "en-US". Used to filter and select a default voice. */
  lang?: string;
  /** Speaking rate: 0.1 to 10, default 1 */
  rate?: number;
  /** Pitch: 0 to 2, default 1 */
  pitch?: number;
  /** Volume: 0 to 1, default 1 */
  volume?: number;
  /** Called when speech starts */
  onStart?: () => void;
  /** Called when speech ends naturally */
  onEnd?: () => void;
  /** Called on error */
  onError?: (error: string) => void;
};

/**
 * Browser text-to-speech via the Web Speech Synthesis API.
 *
 * Notes:
 * - Works in all modern browsers (Chrome, Edge, Safari, Firefox).
 * - Voice quality and availability varies by browser/OS.
 * - Some browsers load voices asynchronously.
 */
export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): SpeechSynthesisState & SpeechSynthesisControls {
  const synth = useMemo(() => (typeof window !== "undefined" ? window.speechSynthesis : null), []);
  const isSupported = !!synth;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices (some browsers load them async)
  useEffect(() => {
    if (!synth) return;

    const loadVoices = () => {
      const available = synth.getVoices();
      setVoices(available);

      // Auto-select a voice matching the language preference
      if (!selectedVoice && available.length > 0) {
        const lang = options.lang ?? "en-US";
        const preferred =
          available.find((v) => v.lang === lang && v.default) ||
          available.find((v) => v.lang === lang) ||
          available.find((v) => v.lang.startsWith(lang.split("-")[0])) ||
          available.find((v) => v.default) ||
          available[0];
        if (preferred) setSelectedVoice(preferred);
      }
    };

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => {
      synth.removeEventListener("voiceschanged", loadVoices);
    };
  }, [synth, options.lang, selectedVoice]);

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!synth || !text.trim()) return;

      // Cancel any ongoing speech
      synth.cancel();
      setError(null);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = options.volume ?? 1;
      if (selectedVoice) utterance.voice = selectedVoice;
      if (options.lang) utterance.lang = options.lang;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        options.onStart?.();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        options.onEnd?.();
      };

      utterance.onerror = (evt) => {
        const errMsg = evt.error ?? "speech_synthesis_error";
        // "interrupted" is normal when cancel() is called
        if (errMsg !== "interrupted") {
          setError(errMsg);
          options.onError?.(errMsg);
        }
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);
    },
    [synth, selectedVoice, options]
  );

  const cancel = useCallback(() => {
    if (!synth) return;
    synth.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [synth]);

  const pause = useCallback(() => {
    if (!synth) return;
    synth.pause();
    setIsPaused(true);
  }, [synth]);

  const resume = useCallback(() => {
    if (!synth) return;
    synth.resume();
    setIsPaused(false);
  }, [synth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      synth?.cancel();
    };
  }, [synth]);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    selectedVoice,
    error,
    speak,
    cancel,
    pause,
    resume,
    setVoice,
  };
}
