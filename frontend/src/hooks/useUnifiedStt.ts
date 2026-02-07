import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechToText } from "./useSpeechToText";
import { useOpenAISpeechToText } from "./useOpenAISpeechToText";

interface UseUnifiedSttOptions {
  onTranscriptChange?: (text: string) => void;
}

export function useUnifiedStt(options: UseUnifiedSttOptions = {}) {
  const { onTranscriptChange } = options;

  const [useOpenAIStt, setUseOpenAIStt] = useState(true);
  const lastDisplayedRef = useRef<string>("");
  const sttActiveRef = useRef(false);

  // Speech-to-Text providers
  const webStt = useSpeechToText({ lang: "en-US", continuous: true, interimResults: true });
  const openaiStt = useOpenAISpeechToText({
    language: "en",
    silenceTimeout: 2000,
    onTranscript: (text) => {
      onTranscriptChange?.(text);
      lastDisplayedRef.current = text;
    },
  });

  // Ref to track current provider preference
  const useOpenAISttRef = useRef(useOpenAIStt);
  useEffect(() => {
    useOpenAISttRef.current = useOpenAIStt;
  }, [useOpenAIStt]);

  // Unified interface
  const sttSupported = useOpenAIStt ? openaiStt.isSupported : webStt.isSupported;
  const isListening = useOpenAIStt ? openaiStt.isListening : webStt.isListening;
  const isProcessing = useOpenAIStt ? openaiStt.isProcessing : false;
  const sttTranscript = useOpenAIStt
    ? openaiStt.transcript
    : (webStt.finalTranscript || (webStt.isListening ? webStt.interimTranscript : ""));
  const sttError = useOpenAIStt ? openaiStt.error : webStt.error;

  // Unified controls
  const startListening = useCallback(() => {
    if (useOpenAIStt) {
      void openaiStt.start();
    } else {
      webStt.start();
    }
  }, [useOpenAIStt, openaiStt, webStt]);

  const stopListening = useCallback(async () => {
    if (useOpenAIStt) {
      return openaiStt.stop();
    } else {
      webStt.stop();
      return "";
    }
  }, [useOpenAIStt, openaiStt, webStt]);

  const resetStt = useCallback(() => {
    if (useOpenAIStt) {
      openaiStt.reset();
    } else {
      webStt.reset();
    }
  }, [useOpenAIStt, openaiStt, webStt]);

  // Get combined transcript for Web Speech API (prevents duplication)
  const getCombinedWebSttTranscript = useCallback(() => {
    const final = webStt.finalTranscript || "";
    const interim = webStt.interimTranscript || "";

    if (!final && !interim) return "";
    if (!interim) return final;
    if (!final) return interim;

    const finalLower = final.toLowerCase();
    const interimLower = interim.toLowerCase();

    if (finalLower.includes(interimLower) || finalLower.endsWith(interimLower.trim())) {
      return final;
    }
    if (interimLower.startsWith(finalLower.trim())) {
      return interim;
    }
    return `${final} ${interim}`.trim();
  }, [webStt.finalTranscript, webStt.interimTranscript]);

  return {
    useOpenAIStt,
    setUseOpenAIStt,
    sttSupported,
    isListening,
    isProcessing,
    sttTranscript,
    sttError,
    startListening,
    stopListening,
    resetStt,
    sttActiveRef,
    lastDisplayedRef,
    webStt,
    getCombinedWebSttTranscript,
  };
}
