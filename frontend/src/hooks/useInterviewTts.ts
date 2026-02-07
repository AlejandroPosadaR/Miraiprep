import { useCallback, useEffect, useRef, useState } from "react";
import { useOpenAITextToSpeech } from "./useOpenAITextToSpeech";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { TTS_VOICES } from "@/constants/ttsVoices";
import { api } from "@/services/api";

interface UseInterviewTtsOptions {
  defaultSpeed?: number;
}

export function useInterviewTts(options: UseInterviewTtsOptions = {}) {
  const { defaultSpeed = 1.0 } = options;

  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [useOpenAITts, setUseOpenAITts] = useState(true);
  const [speakingSpeed, setSpeakingSpeed] = useState(defaultSpeed);
  const [selectedVoice] = useState<string>(() => {
    const voices = TTS_VOICES.map(v => v.id);
    return voices[Math.floor(Math.random() * voices.length)];
  });

  const ttsQueueRef = useRef<string[]>([]);
  const ttsQueueActiveRef = useRef(false);
  const ttsStreamBufferRef = useRef<Map<string, string>>(new Map());
  const ttsOnEndRef = useRef<() => void>(() => {});
  const spokenMessagesRef = useRef<Set<string>>(new Set());

  // Audio queue for seamless playback (OpenAI TTS)
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPreloadingRef = useRef(false);

  // Queue for text chunks with sequence info for ordered playback
  const pendingTtsQueueRef = useRef<{ text: string; sequenceNumber: number; messageId?: string }[]>([]);
  const isProcessingTtsQueueRef = useRef(false);
  const ttsSequenceCounterRef = useRef(0);

  // TTS providers
  const openaiTts = useOpenAITextToSpeech({
    defaultVoice: selectedVoice,
    defaultSpeed: speakingSpeed,
    onEnd: () => ttsOnEndRef.current(),
  });

  const webTts = useSpeechSynthesis({
    lang: "en-US",
    rate: speakingSpeed,
    pitch: 1,
    volume: 1,
    onEnd: () => ttsOnEndRef.current(),
  });

  const tts = useOpenAITts && openaiTts.isSupported ? openaiTts : webTts;
  const ttsSupported = tts.isSupported;
  const isSpeaking = tts.isSpeaking;

  // Store refs for callbacks
  const ttsEnabledRef = useRef(ttsEnabled);
  const ttsSupportedRef = useRef(ttsSupported);
  const selectedVoiceRef = useRef(selectedVoice);
  const speakingSpeedRef = useRef(speakingSpeed);
  const useOpenAITtsRef = useRef(useOpenAITts);
  const openaiTtsRef = useRef(openaiTts);
  const webTtsRef = useRef(webTts);

  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);
  useEffect(() => { ttsSupportedRef.current = ttsSupported; }, [ttsSupported]);
  useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);
  useEffect(() => { speakingSpeedRef.current = speakingSpeed; }, [speakingSpeed]);
  useEffect(() => { useOpenAITtsRef.current = useOpenAITts; }, [useOpenAITts]);
  useEffect(() => { openaiTtsRef.current = openaiTts; }, [openaiTts]);
  useEffect(() => { webTtsRef.current = webTts; }, [webTts]);

  // Process next item in audio queue
  const processNextInQueueRef = useRef<() => void>(() => {});
  const processTtsQueueRef = useRef<() => Promise<void>>(async () => {});

  const processNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length > 0) {
      const nextAudio = audioQueueRef.current.shift();
      if (nextAudio) {
        currentAudioRef.current = nextAudio;
        nextAudio.play().catch((err) => {
          console.error("Audio play error:", err);
          currentAudioRef.current = null;
          processNextInQueueRef.current();
        });
      }
    } else {
      currentAudioRef.current = null;
      ttsQueueActiveRef.current = false;
      if (ttsQueueRef.current.length > 0) {
        void processTtsQueueRef.current();
      }
    }
  }, []);

  useEffect(() => {
    processNextInQueueRef.current = processNextInQueue;
  }, [processNextInQueue]);

  // Cancel speech and clear queues
  const cancelSpeech = useCallback(() => {
    tts.cancel();

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      if (currentAudioRef.current.src.startsWith("blob:")) {
        URL.revokeObjectURL(currentAudioRef.current.src);
      }
      currentAudioRef.current = null;
    }

    audioQueueRef.current.forEach((audio) => {
      audio.pause();
      if (audio.src.startsWith("blob:")) {
        URL.revokeObjectURL(audio.src);
      }
    });
    audioQueueRef.current = [];

    pendingTtsQueueRef.current = [];
    isProcessingTtsQueueRef.current = false;
    ttsSequenceCounterRef.current = 0;
    ttsQueueActiveRef.current = false;
    isPreloadingRef.current = false;
  }, [tts]);

  // Process TTS text queue sequentially
  const processTtsTextQueue = useCallback(async () => {
    if (isProcessingTtsQueueRef.current) return;
    if (pendingTtsQueueRef.current.length === 0) return;

    isProcessingTtsQueueRef.current = true;

    while (pendingTtsQueueRef.current.length > 0) {
      const item = pendingTtsQueueRef.current.shift();
      if (!item) continue;

      try {
        const result = await api.textToSpeech(item.text, {
          voice: selectedVoiceRef.current,
          speed: speakingSpeedRef.current,
          sequenceNumber: item.sequenceNumber,
          messageId: item.messageId,
        });

        const audioUrl = URL.createObjectURL(result.blob);
        const audio = new Audio(audioUrl);

        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(audioUrl);
          processNextInQueueRef.current();
        });

        audio.addEventListener('error', (e) => {
          console.error("Audio error:", e);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          processNextInQueueRef.current();
        });

        if (!currentAudioRef.current) {
          currentAudioRef.current = audio;
          await audio.play();
        } else {
          audioQueueRef.current.push(audio);
        }
      } catch (error) {
        console.error("TTS audio queue error:", error);
      }
    }

    isProcessingTtsQueueRef.current = false;
  }, []);

  // Speak with audio queue
  const speakWithAudioQueue = useCallback((text: string, messageId?: string) => {
    const sequenceNumber = ++ttsSequenceCounterRef.current;
    pendingTtsQueueRef.current.push({ text, sequenceNumber, messageId });
    void processTtsTextQueue();
  }, [processTtsTextQueue]);

  const speakWithAudioQueueRef = useRef(speakWithAudioQueue);
  useEffect(() => {
    speakWithAudioQueueRef.current = speakWithAudioQueue;
  }, [speakWithAudioQueue]);

  // Clean text for speech
  const cleanTextForSpeech = useCallback((text: string) => {
    return text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "")
      .replace(/[*_~]+/g, "")
      .replace(/#+\s*/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n+/g, ". ")
      .trim();
  }, []);

  // Speak text
  const speakText = useCallback(async (text: string) => {
    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;

    if (useOpenAITtsRef.current && openaiTtsRef.current.isSupported) {
      if (speakWithAudioQueueRef.current) {
        speakWithAudioQueueRef.current(cleanText);
      }
    } else if (webTtsRef.current.isSupported) {
      webTtsRef.current.speak(cleanText);
    }
  }, [cleanTextForSpeech]);

  // Process TTS queue
  const processTtsQueue = useCallback(async () => {
    if (ttsQueueActiveRef.current) return;
    if (!ttsEnabledRef.current || !ttsSupportedRef.current) return;

    if (useOpenAITtsRef.current && (currentAudioRef.current || audioQueueRef.current.length > 0)) {
      return;
    }

    const next = ttsQueueRef.current.shift();
    if (!next) return;
    ttsQueueActiveRef.current = true;
    await speakText(next);
  }, [speakText]);

  useEffect(() => {
    processTtsQueueRef.current = processTtsQueue;
  }, [processTtsQueue]);

  useEffect(() => {
    ttsOnEndRef.current = () => {
      if (!useOpenAITtsRef.current) {
        ttsQueueActiveRef.current = false;
        processTtsQueue();
      }
    };
  }, [processTtsQueue]);

  // Enqueue TTS
  const enqueueTts = useCallback(
    (text: string, messageId?: string) => {
      const cleaned = text.trim();
      if (!cleaned) return;

      if (useOpenAITtsRef.current && openaiTtsRef.current.isSupported) {
        void speakWithAudioQueue(cleaned, messageId);
      } else {
        ttsQueueRef.current.push(cleaned);
        processTtsQueue();
      }
    },
    [processTtsQueue, speakWithAudioQueue]
  );

  // Extract speakable chunks
  const extractSpeakableChunks = useCallback((buffer: string) => {
    const chunks: string[] = [];
    let remaining = buffer;
    const sentenceRegex = /(.+?[.!?])(\s|$)/g;
    let match: RegExpExecArray | null;
    while ((match = sentenceRegex.exec(remaining)) !== null) {
      const sentence = match[1]?.trim();
      if (sentence) chunks.push(sentence);
    }
    if (chunks.length > 0) {
      const lastIdx = remaining.lastIndexOf(chunks[chunks.length - 1]) + chunks[chunks.length - 1].length;
      remaining = remaining.slice(lastIdx);
    }
    return { chunks, remaining: remaining.trimStart() };
  }, []);

  // Speak AI response
  const speakAiResponse = useCallback(
    (text: string, messageId: string) => {
      if (!ttsSupportedRef.current || !ttsEnabledRef.current || !text.trim()) return;
      if (spokenMessagesRef.current.has(messageId)) return;
      spokenMessagesRef.current.add(messageId);
      speakText(text);
    },
    [speakText]
  );

  return {
    ttsEnabled,
    setTtsEnabled,
    useOpenAITts,
    setUseOpenAITts,
    speakingSpeed,
    setSpeakingSpeed,
    selectedVoice,
    ttsSupported,
    isSpeaking,
    cancelSpeech,
    enqueueTts,
    extractSpeakableChunks,
    speakAiResponse,
    ttsStreamBufferRef,
    spokenMessagesRef,
    ttsEnabledRef,
    ttsSupportedRef,
  };
}
