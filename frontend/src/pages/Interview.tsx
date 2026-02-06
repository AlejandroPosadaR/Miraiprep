import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import { useAuth } from "@/contexts/AuthContext";
import { api, WS_BASE_URL, type Message, type EvaluationResult, type InterviewSession } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useOpenAITextToSpeech } from "@/hooks/useOpenAITextToSpeech";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useOpenAISpeechToText } from "@/hooks/useOpenAISpeechToText";
import { InterviewSidebar } from "@/components/interview/InterviewSidebar";
import { InterviewHeader } from "@/components/interview/InterviewHeader";
import { InterviewMessages } from "@/components/interview/InterviewMessages";
import { InterviewInput } from "@/components/interview/InterviewInput";
import { InterviewEvaluationModal } from "@/components/interview/InterviewEvaluationModal";

// Available OpenAI TTS voices - professional interviewer voices
// Voice characteristics based on OpenAI TTS documentation:
const TTS_VOICES = [
  { 
    id: "alloy", 
    name: "Alloy", 
    desc: "Neutral, versatile",
    gender: "Androgynous",
    tone: "Balanced, clear",
    bestFor: "General purpose, technical interviews"
  },
  { 
    id: "echo", 
    name: "Echo", 
    desc: "Warm, conversational",
    gender: "Male",
    tone: "Friendly, approachable",
    bestFor: "Casual interviews, coaching sessions"
  },
  { 
    id: "fable", 
    name: "Fable", 
    desc: "Expressive, British",
    gender: "Male",
    tone: "Sophisticated, articulate",
    bestFor: "Formal interviews, storytelling"
  },
  { 
    id: "onyx", 
    name: "Onyx", 
    desc: "Deep, authoritative",
    gender: "Male",
    tone: "Confident, commanding",
    bestFor: "Executive interviews, leadership roles"
  },
  { 
    id: "nova", 
    name: "Nova", 
    desc: "Friendly, energetic",
    gender: "Female",
    tone: "Upbeat, enthusiastic",
    bestFor: "Creative roles, team interviews"
  },
  { 
    id: "shimmer", 
    name: "Shimmer", 
    desc: "Clear, professional",
    gender: "Female",
    tone: "Polished, articulate",
    bestFor: "Professional interviews, presentations"
  },
] as const;

type SessionTopicEvent =
  | {
      type: "accepted";
      sessionId: string;
      userMessageId: string;
      interviewerMessageId: string;
    }
  | {
      type: "ai_delta";
      sessionId: string;
      interviewerMessageId: string;
      delta: string;
      messageStatus?: string;
    }
  | {
      type: "ai_complete";
      sessionId: string;
      interviewerMessageId: string;
      content: string;
      messageStatus?: string;
    }
  | {
      type: "ai_failed";
      sessionId: string;
      interviewerMessageId: string;
      error?: string;
      messageStatus?: string;
    }
  | {
      type: "message_limit_exceeded";
      sessionId: string;
      messageLimit: number;
      messageCount: number;
      tier: string;
      error?: string;
    };

export default function Interview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  // We rely on WebSocket events for real-time updates (no polling).
  // We do one initial GET to hydrate history (useful on refresh/deep-link).
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [connected, setConnected] = useState(false);
  const [didShowSttUnsupportedToast, setDidShowSttUnsupportedToast] = useState(false);
  const [messageLimitReached, setMessageLimitReached] = useState(false);
  const [didShowTtsUnsupportedToast, setDidShowTtsUnsupportedToast] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [useOpenAITts, setUseOpenAITts] = useState(true); // Default to OpenAI TTS (high quality)
  const [useOpenAIStt, setUseOpenAIStt] = useState(true); // Default to OpenAI Whisper (high quality)
  const [speakingSpeed, setSpeakingSpeed] = useState(1.0);
  const [selectedVoice] = useState<string>(() => {
    const voices = TTS_VOICES.map(v => v.id);
    return voices[Math.floor(Math.random() * voices.length)];
  });
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [interviewStartTime] = useState(() => Date.now());
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const clientRef = useRef<Client | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const syncedCompletionsRef = useRef<Set<string>>(new Set());
  const deltaBufferRef = useRef<Map<string, string>>(new Map());
  const flushTimerRef = useRef<number | null>(null);
  const spokenMessagesRef = useRef<Set<string>>(new Set()); // Track which messages we've already spoken
  const sttActiveRef = useRef(false);
  const ttsQueueRef = useRef<string[]>([]);
  const ttsQueueActiveRef = useRef(false);
  const ttsStreamBufferRef = useRef<Map<string, string>>(new Map());
  const ttsOnEndRef = useRef<() => void>(() => {});
  // Audio queue for seamless playback (OpenAI TTS)
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPreloadingRef = useRef(false);
  // Queue for text chunks with sequence info for ordered playback
  const pendingTtsQueueRef = useRef<{ text: string; sequenceNumber: number; messageId?: string }[]>([]);
  const isProcessingTtsQueueRef = useRef(false);
  const ttsSequenceCounterRef = useRef(0); // Counter to assign sequence numbers
  // Track the last displayed STT value to avoid unnecessary updates - MUST be defined before hooks that use it
  const lastDisplayedRef = useRef<string>("");

  // Speech-to-Text: Toggle between Web Speech API (free, instant) and OpenAI Whisper (high quality)
  const webStt = useSpeechToText({ lang: "en-US", continuous: true, interimResults: true });
  const openaiStt = useOpenAISpeechToText({ 
    language: "en", 
    silenceTimeout: 2000,
    onTranscript: (text) => {
      setInput(text);
      lastDisplayedRef.current = text;
    },
  });

  // Camera is now handled in InterviewSidebar component

  // Text-to-Speech: Toggle between OpenAI (high quality) and Web Speech API (free)
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

  // Select active TTS provider
  const tts = useOpenAITts && openaiTts.isSupported ? openaiTts : webTts;

  // Select active STT provider
  const activeStt = useOpenAIStt && openaiStt.isSupported ? openaiStt : webStt;
  
  const sttSupported = useOpenAIStt ? openaiStt.isSupported : webStt.isSupported;
  const isListening = useOpenAIStt ? openaiStt.isListening : webStt.isListening;
  const isProcessing = useOpenAIStt ? openaiStt.isProcessing : false;
  const sttTranscript = useOpenAIStt 
    ? openaiStt.transcript 
    : (webStt.finalTranscript || (webStt.isListening ? webStt.interimTranscript : ""));
  const sttError = useOpenAIStt ? openaiStt.error : webStt.error;
  
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
  
  // Ref to track current STT provider preference
  const useOpenAISttRef = useRef(useOpenAIStt);
  useEffect(() => {
    useOpenAISttRef.current = useOpenAIStt;
  }, [useOpenAIStt]);

  const ttsSupported = tts.isSupported;
  const isSpeaking = tts.isSpeaking;
  
  // Enhanced cancel that also clears audio queue
  const cancelSpeech = useCallback(() => {
    // Cancel current TTS
    tts.cancel();
    
    // Clear OpenAI TTS audio queue
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      if (currentAudioRef.current.src.startsWith("blob:")) {
        URL.revokeObjectURL(currentAudioRef.current.src);
      }
      currentAudioRef.current = null;
    }
    
    // Clear queued audio
    audioQueueRef.current.forEach((audio) => {
      audio.pause();
      if (audio.src.startsWith("blob:")) {
        URL.revokeObjectURL(audio.src);
      }
    });
    audioQueueRef.current = [];
    
    // Clear pending text queue
    pendingTtsQueueRef.current = [];
    isProcessingTtsQueueRef.current = false;
    
    // Reset sequence counter for next message
    ttsSequenceCounterRef.current = 0;
    
    // Reset queue state
    ttsQueueActiveRef.current = false;
    isPreloadingRef.current = false;
  }, [tts]);

  // Store TTS state in refs to avoid WebSocket reconnection loops
  const ttsEnabledRef = useRef(ttsEnabled);
  const ttsSupportedRef = useRef(ttsSupported);
  const selectedVoiceRef = useRef(selectedVoice);
  const speakingSpeedRef = useRef(speakingSpeed);
  const useOpenAITtsRef = useRef(useOpenAITts);
  const openaiTtsRef = useRef(openaiTts);
  const webTtsRef = useRef(webTts);
  
  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);
  
  useEffect(() => {
    ttsSupportedRef.current = ttsSupported;
  }, [ttsSupported]);
  
  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  useEffect(() => {
    speakingSpeedRef.current = speakingSpeed;
  }, [speakingSpeed]);

  useEffect(() => {
    useOpenAITtsRef.current = useOpenAITts;
  }, [useOpenAITts]);

  useEffect(() => {
    openaiTtsRef.current = openaiTts;
  }, [openaiTts]);

  useEffect(() => {
    webTtsRef.current = webTts;
  }, [webTts]);

  // Store speakWithAudioQueue in a ref to break circular dependency
  const speakWithAudioQueueRef = useRef<((text: string, messageId?: string) => void) | null>(null);

  // Enhanced speak function with seamless audio queuing for OpenAI TTS
  const speakText = useCallback(async (text: string) => {
    // Strip markdown for cleaner speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .replace(/`[^`]+`/g, "") // Remove inline code
      .replace(/[*_~]+/g, "") // Remove bold/italic/strikethrough markers
      .replace(/#+\s*/g, "") // Remove heading markers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links to text
      .replace(/\n+/g, ". ") // Convert newlines to pauses
      .trim();

    if (!cleanText) return;

    if (useOpenAITtsRef.current && openaiTtsRef.current.isSupported) {
      // OpenAI TTS: Use seamless audio queue
      if (speakWithAudioQueueRef.current) {
        speakWithAudioQueueRef.current(cleanText);
      }
    } else if (webTtsRef.current.isSupported) {
      // Web Speech API: Queue multiple utterances for seamless playback
      webTtsRef.current.speak(cleanText);
    }
  }, []);

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

  const processTtsTextQueue = useCallback(async () => {
    if (isProcessingTtsQueueRef.current) return;
    
    if (pendingTtsQueueRef.current.length === 0) return;
    
    isProcessingTtsQueueRef.current = true;
    
    while (pendingTtsQueueRef.current.length > 0) {
      const item = pendingTtsQueueRef.current.shift();
      if (!item) continue;
      
      try {
        // Fetch audio blob sequentially with sequence info for backend tracking
        const result = await api.textToSpeech(item.text, {
          voice: selectedVoiceRef.current,
          speed: speakingSpeedRef.current,
          sequenceNumber: item.sequenceNumber,
          messageId: item.messageId,
        });

        // Create audio element
        const audioUrl = URL.createObjectURL(result.blob);
        const audio = new Audio(audioUrl);
        
        (audio as HTMLAudioElement & { _sequence?: number })._sequence = item.sequenceNumber;
        
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

  const speakWithAudioQueue = useCallback((text: string, messageId?: string) => {
    // Assign sequence number to maintain order
    const sequenceNumber = ++ttsSequenceCounterRef.current;
    // Add to pending queue with sequence info
    pendingTtsQueueRef.current.push({ text, sequenceNumber, messageId });
    void processTtsTextQueue();
  }, [processTtsTextQueue]);

  useEffect(() => {
    speakWithAudioQueueRef.current = speakWithAudioQueue;
  }, [speakWithAudioQueue]);

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
      // For OpenAI TTS, queue is handled by audio 'ended' events
    };
  }, [processTtsQueue]);

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

  // Function to speak AI response
  // Using refs to avoid dependency issues that cause WebSocket reconnections
  const speakAiResponse = useCallback(
    (text: string, messageId: string) => {
      if (!ttsSupportedRef.current || !ttsEnabledRef.current || !text.trim()) return;
      if (spokenMessagesRef.current.has(messageId)) return;
      spokenMessagesRef.current.add(messageId);
      speakText(text);
    },
    [speakText]
  );

  const speakAiResponseRef = useRef(speakAiResponse);
  useEffect(() => {
    speakAiResponseRef.current = speakAiResponse;
  }, [speakAiResponse]);

  // Sync STT transcript into input - prevent duplication
  useEffect(() => {
    if (isListening) {
      // When actively listening, combine finalTranscript + interimTranscript
      // But be smart about avoiding duplication
      const final = webStt.finalTranscript || "";
      const interim = webStt.interimTranscript || "";
      
      let combined = "";
      
      if (final && interim) {
        // Both exist - check if interim is already part of final
        // Web Speech API: when text is finalized, it moves from interim to final
        // But interim might briefly still contain it before being cleared
        const finalLower = final.toLowerCase();
        const interimLower = interim.toLowerCase();
        
        // If interim is a substring of final (already finalized), just use final
        if (finalLower.includes(interimLower) || finalLower.endsWith(interimLower.trim())) {
          combined = final;
        } 
        // If final is a substring of interim (interim is continuation), use interim
        else if (interimLower.startsWith(finalLower.trim())) {
          combined = interim;
        }
        // Otherwise, they're different - combine them
        else {
          combined = `${final} ${interim}`.trim();
        }
      } else if (final) {
        combined = final;
      } else if (interim) {
        combined = interim;
      }
      
      // Only update if the value actually changed
      if (combined.trim() !== lastDisplayedRef.current) {
        lastDisplayedRef.current = combined.trim();
        setInput(combined.trim());
      }
    } else {
      const final = webStt.finalTranscript || "";
      if (final !== lastDisplayedRef.current) {
        lastDisplayedRef.current = final;
        setInput(final);
      }
    }
  }, [isListening, webStt.finalTranscript, webStt.interimTranscript]);

  // Surface STT errors to the user once (and stop listening).
  useEffect(() => {
    if (!sttError) return;
    sttActiveRef.current = false;
    void stopListening();
    toast({
      title: "Speech-to-text error",
      description:
        sttError === "not-allowed" || sttError === "service-not-allowed"
          ? "Microphone permission denied. Please allow mic access in your browser settings."
          : sttError === "no-speech"
            ? "No speech detected. Try again."
            : sttError === "audio-capture"
              ? "No microphone found. Please connect a mic and try again."
              : sttError,
      variant: "destructive",
    });
  }, [sttError, stopListening, toast]);

  // Use ref to avoid dependency issues
  const cancelSpeechRef = useRef(cancelSpeech);
  useEffect(() => {
    cancelSpeechRef.current = cancelSpeech;
  }, [cancelSpeech]);

  useEffect(() => {
    if (isListening && isSpeaking) {
      cancelSpeechRef.current();
    }
  }, [isListening, isSpeaking]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getMessages(sessionId, { limit: 200 });
        if (!cancelled) setMessages(list);
      } catch (e) {
        if (!cancelled) {
          toast({
            title: "Couldn't load messages",
            description: e instanceof Error ? e.message : undefined,
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, toast]);

  // Load session info
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const sessionData = await api.getInterviewSession(sessionId);
        if (!cancelled) setSession(sessionData);
      } catch {
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - interviewStartTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setElapsedTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [interviewStartTime]);

  const syncOnceOnComplete = useCallback(
    async (interviewerMessageId: string) => {
      if (!sessionId) return;
      if (syncedCompletionsRef.current.has(interviewerMessageId)) return;
      syncedCompletionsRef.current.add(interviewerMessageId);
      try {
        const list = await api.getMessages(sessionId, { limit: 200 });
        setMessages(list);
      } catch {
      }
    },
    [sessionId]
  );

  const syncOnceOnCompleteRef = useRef(syncOnceOnComplete);
  useEffect(() => {
    syncOnceOnCompleteRef.current = syncOnceOnComplete;
  }, [syncOnceOnComplete]);

  const scheduleDeltaFlush = () => {
    if (flushTimerRef.current != null) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      const buffered = deltaBufferRef.current;
      if (buffered.size === 0) return;
      const updates = new Map(buffered);
      buffered.clear();
      setMessages((prev) =>
        prev.map((m) => {
          const delta = updates.get(m.id);
          if (!delta) return m;
          return { ...m, content: (m.content || "") + delta };
        })
      );
    }, 50);
  };

  useEffect(() => {
    if (!sessionId || !user?.userId) return;
    // Avoid creating multiple clients for the same session/user.
    if (clientRef.current?.active) return;
    const c = new Client({
      brokerURL: `${WS_BASE_URL}/ws`,
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        c.subscribe(`/topic/session/${sessionId}`, (frame) => {
          try {
            const evt = JSON.parse(frame.body) as SessionTopicEvent;
            if (!evt?.type) return;

            if (evt.type === "accepted") {
              // Replace last optimistic USER message id, and create placeholder immediately
              setMessages((prev) => {
                const next = [...prev];
                for (let i = next.length - 1; i >= 0; i--) {
                  if (next[i].id.startsWith("opt-") && next[i].role === "USER") {
                    next[i] = { ...next[i], id: evt.userMessageId, messageStatus: "STREAMING" };
                    break;
                  }
                }
                const hasPlaceholder = next.some((m) => m.id === evt.interviewerMessageId);
                if (!hasPlaceholder) {
                  next.push({
                    id: evt.interviewerMessageId,
                    sessionId: evt.sessionId,
                    seq: next.length + 1,
                    role: "INTERVIEWER",
                    messageStatus: "STREAMING",
                    content: "",
                    audioUrl: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                }
                return next;
              });
              return;
            }

            if (evt.type === "ai_delta") {
              const delta = evt.delta ?? "";
              if (!delta) return;
              // Buffer deltas and flush in batches to avoid re-rendering per token.
              const id = evt.interviewerMessageId;
              const existing = deltaBufferRef.current.get(id) || "";
              deltaBufferRef.current.set(id, existing + delta);
              scheduleDeltaFlush();
              // Stream TTS by sentence as tokens arrive - with preloading for seamless playback
              if (ttsEnabledRef.current && ttsSupportedRef.current) {
                const streamBuffer = ttsStreamBufferRef.current.get(id) || "";
                const updatedBuffer = streamBuffer + delta;
                const { chunks, remaining } = extractSpeakableChunks(updatedBuffer);
                if (chunks.length > 0) {
                  // Enqueue all chunks with messageId for ordered playback
                  chunks.forEach((chunk) => enqueueTts(chunk, id));
                  spokenMessagesRef.current.add(id);
                }
                ttsStreamBufferRef.current.set(id, remaining);
              }
              return;
            }

            if (evt.type === "ai_complete") {
              // One and only one GET (per interviewer message) once the model is done.
              // Avoids hammering the backend during streaming.
              void syncOnceOnCompleteRef.current(evt.interviewerMessageId);
              if (ttsEnabledRef.current && ttsSupportedRef.current) {
                const buffer = ttsStreamBufferRef.current.get(evt.interviewerMessageId) || "";
                if (buffer.trim()) {
                  enqueueTts(buffer, evt.interviewerMessageId);
                  spokenMessagesRef.current.add(evt.interviewerMessageId);
                } else if (evt.content && !spokenMessagesRef.current.has(evt.interviewerMessageId)) {
                  enqueueTts(evt.content, evt.interviewerMessageId);
                  spokenMessagesRef.current.add(evt.interviewerMessageId);
                }
                ttsStreamBufferRef.current.delete(evt.interviewerMessageId);
              } else if (evt.content) {
                speakAiResponseRef.current(evt.content, evt.interviewerMessageId);
              }
              return;
            }

            if (evt.type === "ai_failed") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === evt.interviewerMessageId
                    ? { ...m, messageStatus: evt.messageStatus ?? "FAILED" }
                    : m
                )
              );
              toast({ title: "AI response error", description: evt.error ?? undefined, variant: "destructive" });
            }

            if (evt.type === "message_limit_exceeded") {
              // Remove the optimistic message since it wasn't accepted
              setMessages((prev) => prev.filter((m) => !m.id.startsWith("opt-")));
              setMessageLimitReached(true);
              toast({ 
                title: "Message limit reached", 
                description: `You have used ${evt.messageCount} of ${evt.messageLimit} messages on the ${evt.tier} tier. Upgrade to continue.`,
                variant: "destructive" 
              });
            }
          } catch {
            // ignore non-JSON frames
          }
        });
      },
      onStompError: (frame) => {
        console.error("STOMP error", frame);
        setConnected(false);
      },
      onWebSocketClose: () => setConnected(false),
    });
    c.activate();
    clientRef.current = c;
    return () => {
      cancelSpeechRef.current();
      c.deactivate();
      clientRef.current = null;
    };
  }, [sessionId, user?.userId, enqueueTts, extractSpeakableChunks, toast]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !sessionId || !user?.userId || sending) return;
    setSending(true);
    setInput("");
    lastDisplayedRef.current = ""; // Clear the tracking ref
    sttActiveRef.current = false;
    void stopListening();
    resetStt();
    const optimisticId = `opt-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        sessionId: sessionId!,
        seq: prev.length + 1,
        role: "USER" as const,
        messageStatus: "PENDING",
        content: text,
        audioUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    try {
      const client = clientRef.current;
      if (!client?.connected) {
        toast({ title: "Not connected", description: "WebSocket reconnecting…", variant: "destructive" });
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        return;
      }
      client.publish({
        destination: "/app/interview/send",
        body: JSON.stringify({
          sessionId,
          userId: user.userId,
          content: text,
          idempotencyKey: `${sessionId}-${Date.now()}`,
        }),
      });
    } catch (e) {
      toast({
        title: "Couldn't send message",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } finally {
      setSending(false);
    }
  };

  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);

  const handleEndInterview = async () => {
    if (!sessionId || ending || session?.status === "COMPLETED") return;
    
    // Stop all speech immediately
    cancelSpeech();
    
    setEnding(true);
    try {
      await api.completeSession(sessionId);
      setEvaluating(true);
      const result = await api.evaluateInterview(sessionId);
      setEvaluation(result);
      setShowEvaluation(true);
    } catch (e) {
      toast({
        title: "Couldn't end interview",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setEnding(false);
      setEvaluating(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Missing session.</p>
        <Link to="/dashboard" className="text-primary ml-2 underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const experienceLevelLabel = session?.experienceYears != null
    ? session.experienceYears <= 1 ? "Entry Level"
      : session.experienceYears <= 3 ? "Mid Level"
      : session.experienceYears <= 6 ? "Senior"
      : "Staff+"
    : "Mid Level";

  const interviewTypeLabel = session?.interviewType
    ? session.interviewType === "OOP" ? "OOP Concepts"
      : session.interviewType === "SPRING_BOOT" ? "Spring Boot"
      : session.interviewType === "SYSTEM_DESIGN" ? "System Design"
      : session.interviewType === "JAVASCRIPT_REACT" ? "JavaScript / React"
      : session.interviewType === "BEHAVIORAL" ? "Behavioral"
      : session.interviewType === "FULLSTACK" ? "Fullstack"
      : session.interviewType
    : "Technical";

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Sidebar */}
      <InterviewSidebar
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        isSpeaking={isSpeaking}
        isListening={isListening}
        selectedVoice={selectedVoice}
        session={session}
        messages={messages}
        elapsedTime={elapsedTime}
        connected={connected}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <InterviewHeader
          isSpeaking={isSpeaking}
          isProcessing={isProcessing}
          isListening={isListening}
          useOpenAIStt={useOpenAIStt}
          useOpenAITts={useOpenAITts}
          ttsEnabled={ttsEnabled}
          ttsSupported={ttsSupported}
          speakingSpeed={speakingSpeed}
          session={session}
          ending={ending}
          didShowTtsUnsupportedToast={didShowTtsUnsupportedToast}
          onBack={() => {}}
          onToggleStt={() => {
            setInput("");
            lastDisplayedRef.current = "";
            setUseOpenAIStt((prev) => !prev);
          }}
          onToggleTts={() => setUseOpenAITts((prev) => !prev)}
          onToggleTtsEnabled={() => {
            if (!ttsSupported) {
              if (!didShowTtsUnsupportedToast) {
                setDidShowTtsUnsupportedToast(true);
                toast({
                  title: "Text-to-speech not supported",
                  description: useOpenAITts 
                    ? "OpenAI TTS unavailable. Check your API key."
                    : "This browser doesn't support Web Speech Synthesis.",
                  variant: "destructive",
                });
              }
              return;
            }
            if (ttsEnabled && isSpeaking) {
              cancelSpeech();
            }
            setTtsEnabled((prev) => !prev);
          }}
          onSpeedChange={(speed) => setSpeakingSpeed(speed)}
          onEndInterview={handleEndInterview}
          onStopListening={async () => {
            await stopListening();
          }}
          onResetStt={resetStt}
          onCancelSpeech={cancelSpeech}
          onShowTtsUnsupportedToast={() => {
            setDidShowTtsUnsupportedToast(true);
            toast({
              title: "Text-to-speech not supported",
              description: useOpenAITts 
                ? "OpenAI TTS unavailable. Check your API key."
                : "This browser doesn't support Web Speech Synthesis.",
              variant: "destructive",
            });
          }}
        />

        <InterviewMessages messages={messages} loading={loading} />

        <InterviewInput
          input={input}
          setInput={setInput}
          sending={sending}
          connected={connected}
          isListening={isListening}
          isProcessing={isProcessing}
          sttSupported={sttSupported}
          useOpenAIStt={useOpenAIStt}
          didShowSttUnsupportedToast={didShowSttUnsupportedToast}
          messageLimitReached={messageLimitReached}
          onInputChange={(value) => setInput(value)}
          onSend={sendMessage}
          onMicClick={async () => {
            if (isListening || isProcessing) {
              await stopListening();
              return;
            }
            if (isSpeaking) {
              cancelSpeech();
            }
            setInput("");
            lastDisplayedRef.current = "";
            resetStt();
            setTimeout(() => {
              startListening();
            }, 50);
          }}
          onShowSttUnsupportedToast={() => {
            setDidShowSttUnsupportedToast(true);
            toast({
              title: "Speech-to-text not supported",
              description: useOpenAIStt 
                ? "Microphone access not available." 
                : "This browser doesn't support Web Speech API. Try Chrome/Edge.",
              variant: "destructive",
            });
          }}
        />
      </div>

      <InterviewEvaluationModal
        showEvaluation={showEvaluation}
        evaluation={evaluation}
        evaluating={evaluating}
        onClose={() => setShowEvaluation(false)}
      />
    </div>
  );
}
