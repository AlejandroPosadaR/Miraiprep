import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { api, WS_BASE_URL, type Message, type EvaluationResult, type InterviewSession } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mic, MicOff, Send, Phone, Loader2, Volume2, VolumeX, Sparkles, Zap, Waves, Trophy, Brain, MessageSquare, Lightbulb, Target, X, User, Clock, FileText, ChevronLeft, ChevronRight, Gauge, Video, VideoOff } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { useOpenAITextToSpeech } from "@/hooks/useOpenAITextToSpeech";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useOpenAISpeechToText } from "@/hooks/useOpenAISpeechToText";
import { Slider } from "@/components/ui/slider";

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
  const isProcessingTtsQueueRef = useRef(false); // Flag to ensure sequential processing
  const ttsSequenceCounterRef = useRef(0); // Counter to assign sequence numbers

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

  // Camera for video call experience
  const camera = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Connect camera stream to video element
  useEffect(() => {
    if (videoRef.current && camera.stream) {
      videoRef.current.srcObject = camera.stream;
    }
  }, [camera.stream]);

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
  
  // Unified STT interface
  const sttSupported = useOpenAIStt ? openaiStt.isSupported : webStt.isSupported;
  const isListening = useOpenAIStt ? openaiStt.isListening : webStt.isListening;
  const isProcessing = useOpenAIStt ? openaiStt.isProcessing : false;
  const sttTranscript = useOpenAIStt 
    ? openaiStt.transcript 
    : (webStt.finalTranscript || (webStt.isListening ? webStt.interimTranscript : ""));
  const sttError = useOpenAIStt ? openaiStt.error : webStt.error;
  
  // Unified STT controls that work with both providers
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
      await speakWithAudioQueue(cleanText);
    } else if (webTtsRef.current.isSupported) {
      // Web Speech API: Queue multiple utterances for seamless playback
      webTtsRef.current.speak(cleanText);
    }
  }, []); // Empty deps - using refs instead

  // Process next item in TTS queue - used by audio ended callbacks
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
      // Process text queue if there's more
      if (ttsQueueRef.current.length > 0) {
        void processTtsQueueRef.current();
      }
    }
  }, []);
  
  useEffect(() => {
    processNextInQueueRef.current = processNextInQueue;
  }, [processNextInQueue]);

  // Process TTS text queue sequentially to ensure correct order
  const processTtsTextQueue = useCallback(async () => {
    // If already processing, wait
    if (isProcessingTtsQueueRef.current) return;
    
    // If queue is empty, nothing to do
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
        
        // Store sequence info on audio element for debugging
        (audio as HTMLAudioElement & { _sequence?: number })._sequence = item.sequenceNumber;
        
        // Set up seamless transition - when this audio ends, play next in queue
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

        // If nothing is playing, start immediately
        if (!currentAudioRef.current) {
          currentAudioRef.current = audio;
          await audio.play();
        } else {
          // Queue it to play seamlessly after current audio ends
          audioQueueRef.current.push(audio);
        }
      } catch (error) {
        console.error("TTS audio queue error:", error);
        // Continue processing next item even if this one failed
      }
    }
    
    isProcessingTtsQueueRef.current = false;
  }, []);

  // Seamless audio queue for OpenAI TTS - queues text with sequence number and processes sequentially
  const speakWithAudioQueue = useCallback((text: string, messageId?: string) => {
    // Assign sequence number to maintain order
    const sequenceNumber = ++ttsSequenceCounterRef.current;
    // Add to pending queue with sequence info
    pendingTtsQueueRef.current.push({ text, sequenceNumber, messageId });
    // Start processing if not already processing
    void processTtsTextQueue();
  }, [processTtsTextQueue]);

  const processTtsQueue = useCallback(async () => {
    if (ttsQueueActiveRef.current) return;
    if (!ttsEnabledRef.current || !ttsSupportedRef.current) return;
    
    // For OpenAI TTS, check if audio is already playing or queued
    if (useOpenAITtsRef.current && (currentAudioRef.current || audioQueueRef.current.length > 0)) {
      // Audio is playing or queued, process text queue when current audio ends
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
      // For Web Speech API, process next in queue
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
      
      // For OpenAI TTS, start preloading immediately even if audio is playing
      if (useOpenAITtsRef.current && openaiTtsRef.current.isSupported) {
        // Start preloading this chunk immediately (will queue if audio is playing)
        void speakWithAudioQueue(cleaned, messageId);
      } else {
        // For Web Speech API, use the queue system
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
      // Don't speak the same message twice
      if (spokenMessagesRef.current.has(messageId)) return;
      spokenMessagesRef.current.add(messageId);
      speakText(text);
    },
    [speakText]
  );

  // Keep these callbacks in refs so the WebSocket connection effect does not reconnect on re-renders.
  const speakAiResponseRef = useRef(speakAiResponse);
  useEffect(() => {
    speakAiResponseRef.current = speakAiResponse;
  }, [speakAiResponse]);

  // Sync STT transcript into input - prevent duplication
  // Track the last displayed value to avoid unnecessary updates
  const lastDisplayedRef = useRef<string>("");
  
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
      // When stopped listening, only use finalTranscript (interim should be cleared)
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

  // Stop TTS when user starts speaking (to avoid overlap)
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
            title: "Failed to load messages",
            description: e instanceof Error ? e.message : "Unknown error",
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
        // Session info is optional, don't show error
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
        // don't toast spam; UI already has the content from WS
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
              // If streaming TTS didn't speak the remainder, flush it now.
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
              toast({ title: "AI failed", description: evt.error ?? "Unknown error", variant: "destructive" });
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
      // Stop all speech when component unmounts or session changes
      cancelSpeechRef.current();
      c.deactivate();
      clientRef.current = null;
    };
  }, [sessionId, user?.userId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !sessionId || !user?.userId || sending) return;
    setSending(true);
    setInput("");
    lastDisplayedRef.current = ""; // Clear the tracking ref
    // Keep the mic UI clean after sending.
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
        title: "Send failed",
        description: e instanceof Error ? e.message : "Unknown error",
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
        title: "Failed to end interview",
        description: e instanceof Error ? e.message : "Unknown error",
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
      <aside
        className={`${
          sidebarCollapsed ? "w-0 md:w-16" : "w-72"
        } border-r bg-muted/20 flex-shrink-0 flex flex-col transition-all duration-300 overflow-y-auto overflow-x-visible`}
      >
        {/* Sidebar Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background border rounded-r-lg p-1 hover:bg-muted transition-colors md:hidden"
          style={{ left: sidebarCollapsed ? 0 : "17rem" }}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {!sidebarCollapsed && (
          <>
            {/* Video Call Area */}
            <div className="p-4 border-b space-y-4">
              {/* AI Interviewer Avatar - Animated when speaking */}
              <div className="relative" style={{ overflow: "visible" }}>
                <div 
                  className={`w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg relative ${
                    isSpeaking ? "animate-pulse" : ""
                  }`}
                  style={{ overflow: "visible" }}
                >
                  {/* Speaking animation rings - visible outside container */}
                  {isSpeaking && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-violet-400/40 animate-ping" style={{ zIndex: 0 }} />
                      <div className="absolute rounded-full border-2 border-violet-400/60 animate-pulse" style={{ 
                        top: "-8px", 
                        left: "-8px", 
                        right: "-8px", 
                        bottom: "-8px",
                        zIndex: -1
                      }} />
                      <div className="absolute rounded-full border border-violet-300/40 animate-pulse" style={{ 
                        top: "-16px", 
                        left: "-16px", 
                        right: "-16px", 
                        bottom: "-16px",
                        zIndex: -2,
                        animationDelay: "0.2s"
                      }} />
                    </>
                  )}
                  <Brain className="h-14 w-14 text-white relative z-10" />
                </div>
                {/* Speaking indicator */}
                {isSpeaking && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 bg-violet-500 rounded-full">
                    <Waves className="h-3 w-3 text-white animate-pulse" />
                    <span className="text-[10px] text-white font-medium">Speaking</span>
                  </div>
                )}
              </div>
              <p className="text-center font-semibold">AI Interviewer</p>
              <p className="text-center text-xs text-muted-foreground">
                {TTS_VOICES.find(v => v.id === selectedVoice)?.name || "Voice Assistant"}
              </p>

              {/* Divider */}
              <div className="border-t pt-4">
                {/* User Camera View */}
                <div className="relative">
                  <div className={`aspect-video rounded-xl overflow-hidden bg-muted border-2 ${
                    isListening ? "border-red-500 shadow-lg shadow-red-500/20" : "border-transparent"
                  }`}>
                    {camera.isEnabled ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover mirror"
                        style={{ transform: "scaleX(-1)" }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <VideoOff className="h-8 w-8 mb-2" />
                        <span className="text-xs">Camera off</span>
                      </div>
                    )}
                    {/* Listening indicator overlay */}
                    {isListening && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 bg-red-500 rounded-full">
                        <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                        <span className="text-[10px] text-white font-medium">Listening</span>
                      </div>
                    )}
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-2">You</p>
                  
                  {/* Camera Toggle */}
                  <Button
                    variant={camera.isEnabled ? "secondary" : "outline"}
                    size="sm"
                    className="w-full mt-2 gap-2"
                    onClick={() => camera.toggle()}
                    disabled={camera.isLoading}
                  >
                    {camera.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : camera.isEnabled ? (
                      <>
                        <Video className="h-4 w-4" />
                        <span>Camera On</span>
                      </>
                    ) : (
                      <>
                        <VideoOff className="h-4 w-4" />
                        <span>Turn On Camera</span>
                      </>
                    )}
                  </Button>
                  {camera.error && (
                    <p className="text-xs text-red-500 mt-1 text-center">{camera.error}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Interview Info */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* Timer */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                <Clock className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-mono font-semibold text-lg">{elapsedTime}</p>
                </div>
              </div>

              {/* Interview Type */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                <Target className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Interview Type</p>
                  <p className="font-medium">{interviewTypeLabel}</p>
                </div>
              </div>

              {/* Experience Level */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                <Trophy className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Experience Level</p>
                  <p className="font-medium">{experienceLevelLabel}</p>
                </div>
              </div>

              {/* Questions Asked */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                <MessageSquare className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Messages</p>
                  <p className="font-medium">{messages.length}</p>
                </div>
              </div>

              {/* Job Description (if provided) */}
              {session?.jobDescription && (
                <div className="p-3 rounded-lg bg-background border">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-violet-500" />
                    <p className="text-xs text-muted-foreground font-medium">Job Description</p>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-4">
                    {session.jobDescription}
                  </p>
                </div>
              )}
            </div>

            {/* Connection Status */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <div className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                <span className={connected ? "text-emerald-600" : "text-amber-600"}>
                  {connected ? "Connected" : "Connecting..."}
                </span>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <span className="font-medium hidden sm:inline">Interview</span>
            {/* Status indicators with better design */}
            {isSpeaking && (
              <span className="text-xs text-violet-600 dark:text-violet-400 flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-50 dark:bg-violet-950/30">
                <Waves className="h-3 w-3 animate-pulse" />
                <span className="hidden sm:inline">AI Speaking</span>
              </span>
            )}
            {isProcessing && (
              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Transcribing</span>
              </span>
            )}
            {isListening && (
              <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 dark:bg-red-950/30">
                <Mic className="h-3 w-3 animate-pulse" />
                <span className="hidden sm:inline">Listening</span>
              </span>
            )}
          </div>
        <div className="flex items-center gap-2">
          {/* Voice Settings Group */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-muted/30">
            {/* STT Quality Toggle - OpenAI Whisper (high quality) vs Web Speech API (instant, free) */}
            <Button
              variant={useOpenAIStt ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                // Stop any active listening when switching providers
                if (isListening) {
                  void stopListening();
                }
                resetStt();
                setInput("");
                lastDisplayedRef.current = "";
                setUseOpenAIStt((prev) => !prev);
              }}
              className="gap-1.5 h-7 text-xs"
              title={useOpenAIStt 
                ? "Using OpenAI Whisper STT (high quality, slight delay)" 
                : "Using Web Speech API STT (instant, free)"}
              disabled={isListening || isProcessing}
            >
              {useOpenAIStt ? (
                <>
                  <Sparkles className="h-3 w-3" />
                  <span className="hidden sm:inline">Premium STT</span>
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3" />
                  <span className="hidden sm:inline">Free STT</span>
                </>
              )}
            </Button>

            <div className="w-px h-4 bg-border" />

            {/* TTS Quality Toggle - OpenAI (high quality) vs Web Speech API (free) */}
            <Button
              variant={useOpenAITts ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setUseOpenAITts((prev) => !prev)}
              className="gap-1.5 h-7 text-xs"
              title={useOpenAITts ? "Using OpenAI TTS (high quality)" : "Using Web Speech API TTS (free)"}
            >
              {useOpenAITts ? (
                <>
                  <Sparkles className="h-3 w-3" />
                  <span className="hidden sm:inline">Premium TTS</span>
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3" />
                  <span className="hidden sm:inline">Free TTS</span>
                </>
              )}
            </Button>

            {/* TTS Toggle with better visual feedback */}
            <Button
              variant={ttsEnabled ? (isSpeaking ? "default" : "secondary") : "ghost"}
              size="sm"
              onClick={() => {
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
              className="h-7 gap-1.5"
              title={ttsEnabled ? (isSpeaking ? "AI is speaking (click to stop)" : "AI voice on (click to disable)") : "AI voice off (click to enable)"}
            >
              {isSpeaking ? (
                <>
                  <Waves className="h-3 w-3 animate-pulse" />
                  <span className="hidden sm:inline text-xs">Speaking</span>
                </>
              ) : ttsEnabled ? (
                <>
                  <Volume2 className="h-3 w-3" />
                  <span className="hidden sm:inline text-xs">Voice On</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3 w-3" />
                  <span className="hidden sm:inline text-xs">Voice Off</span>
                </>
              )}
            </Button>

            {/* Speed Control - only show when TTS is enabled */}
            {ttsEnabled && (
              <div className="flex items-center gap-1.5 px-2 border-l border-border/50">
                <Gauge className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <Slider
                  value={[speakingSpeed]}
                  onValueChange={(value) => setSpeakingSpeed(value[0])}
                  min={0.5}
                  max={1.5}
                  step={0.1}
                  className="w-16 sm:w-20"
                  title={`Speaking speed: ${speakingSpeed.toFixed(1)}x`}
                />
                <span className="text-xs text-muted-foreground min-w-[2.5rem] text-right">
                  {speakingSpeed.toFixed(1)}x
                </span>
              </div>
            )}
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={ending || session?.status === "COMPLETED"}
            onClick={handleEndInterview}
            title={session?.status === "COMPLETED" ? "Interview already completed" : "End interview"}
          >
            {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4 mr-2 rotate-[135deg]" />}
            {session?.status === "COMPLETED" ? "Completed" : "End Interview"}
          </Button>
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No messages yet. Say hello to start.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  m.role === "USER"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-xs opacity-80 mb-0.5">{m.role}</p>
                {m.content && m.content.trim() ? (
                  <div className="text-sm break-words">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                ) : m.role === "INTERVIEWER" && (m.messageStatus === "STREAMING" || m.messageStatus === "PENDING") ? (
                  <div className="flex items-center gap-1 py-1 text-muted-foreground">
                    <span className="sr-only">Interviewer is typing</span>
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.25s]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">(empty)</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t bg-background flex gap-2 flex-shrink-0">
        {/* Enhanced Mic Button with visual feedback */}
        <div className="relative">
          <Button
            type="button"
            variant={isListening ? "destructive" : isProcessing ? "secondary" : "outline"}
            size="icon"
            disabled={sending || !connected || isProcessing}
            onClick={async () => {
              if (!sttSupported) {
                if (!didShowSttUnsupportedToast) {
                  setDidShowSttUnsupportedToast(true);
                  toast({
                    title: "Speech-to-text not supported",
                    description: useOpenAIStt 
                      ? "Microphone access not available." 
                      : "This browser doesn't support Web Speech API. Try Chrome/Edge.",
                    variant: "destructive",
                  });
                }
                return;
              }
              if (isListening || isProcessing) {
                await stopListening();
                return;
              }
              if (isSpeaking) {
                cancelSpeech();
              }
              // Clear input and reset STT before starting new recording to prevent duplication
              setInput("");
              lastDisplayedRef.current = "";
              resetStt();
              // Small delay to ensure reset completes before starting
              setTimeout(() => {
                startListening();
              }, 50);
            }}
            className={`relative h-10 w-10 ${
              isListening 
                ? "animate-pulse shadow-lg shadow-red-500/50" 
                : isProcessing 
                  ? "animate-pulse" 
                  : ""
            }`}
            aria-label={isListening ? "Stop speech-to-text" : isProcessing ? "Processing..." : "Start speech-to-text"}
            title={
              isListening 
                ? "Listening... (click to stop)" 
                : isProcessing 
                  ? "Processing your speech..."
                  : useOpenAIStt 
                    ? "Start voice input (OpenAI Whisper)" 
                    : "Start voice input (Web Speech API)"
            }
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isListening ? (
              <>
                <MicOff className="h-4 w-4" />
                {/* Pulsing ring animation when listening */}
                <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
              </>
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          {/* Status indicator */}
          {isListening && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
          )}
          {isProcessing && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full border-2 border-background animate-pulse" />
          )}
        </div>

        {/* Input with better visual feedback */}
        <div className="flex-1 relative">
          <Input
            placeholder={
              isListening 
                ? "🎤 Listening..." 
                : isProcessing 
                  ? "⏳ Transcribing..." 
                  : "Type your message or click mic to speak…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={sending || !connected}
            className={`transition-all ${
              isListening 
                ? "border-red-500 bg-red-50 dark:bg-red-950/20 shadow-sm" 
                : isProcessing 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                  : ""
            }`}
          />
          {/* Visual waveform indicator when listening */}
          {isListening && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <div className="h-1 w-1 bg-red-500 rounded-full animate-pulse [animation-delay:0ms]" />
              <div className="h-1.5 w-1 bg-red-500 rounded-full animate-pulse [animation-delay:150ms]" />
              <div className="h-2 w-1 bg-red-500 rounded-full animate-pulse [animation-delay:300ms]" />
              <div className="h-1.5 w-1 bg-red-500 rounded-full animate-pulse [animation-delay:450ms]" />
              <div className="h-1 w-1 bg-red-500 rounded-full animate-pulse [animation-delay:600ms]" />
            </div>
          )}
        </div>

        {/* Send button */}
        <Button 
          onClick={sendMessage} 
          disabled={sending || !connected || !input.trim()}
          className="h-10 px-4"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="hidden sm:inline">Sending</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </Button>
      </div>
      </div>

      {/* Evaluation Modal */}
      {showEvaluation && evaluation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-2xl shadow-xl my-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Interview Complete!</h3>
                  <p className="text-muted-foreground">Here&apos;s your performance evaluation</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowEvaluation(false);
                  navigate("/dashboard");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Overall Score */}
            <div className="text-center mb-8">
              <div className="text-6xl font-bold bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">
                {evaluation.overallScore?.toFixed(1) || "0"}/10
              </div>
              <p className="text-muted-foreground mt-1">Overall Score</p>
            </div>

            {/* Category Scores */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: "Knowledge", value: evaluation.knowledge, icon: Brain, color: "bg-blue-500" },
                { label: "Communication", value: evaluation.communication, icon: MessageSquare, color: "bg-green-500" },
                { label: "Problem Solving", value: evaluation.problemSolving, icon: Lightbulb, color: "bg-amber-500" },
                { label: "Technical Depth", value: evaluation.technicalDepth, icon: Target, color: "bg-purple-500" },
              ].map((cat) => (
                <div key={cat.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <cat.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${cat.color} transition-all duration-500`}
                        style={{ width: `${cat.value || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold w-10 text-right">{cat.value || 0}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Feedback */}
            {evaluation.feedback && (
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-2">Feedback</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{evaluation.feedback}</p>
              </div>
            )}

            {/* Strengths & Areas for Improvement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {evaluation.strengths && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">💪 Strengths</h4>
                  <p className="text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap">{evaluation.strengths}</p>
                </div>
              )}
              {evaluation.areasForImprovement && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">📈 Areas to Improve</h4>
                  <p className="text-sm text-amber-800 dark:text-amber-300 whitespace-pre-wrap">{evaluation.areasForImprovement}</p>
                </div>
              )}
            </div>

            <Button
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600"
              onClick={() => {
                setShowEvaluation(false);
                navigate("/dashboard");
              }}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      )}

      {/* Evaluating overlay */}
      {evaluating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-violet-500" />
            <h3 className="text-xl font-bold mb-2">Evaluating your interview...</h3>
            <p className="text-muted-foreground">Our AI is analyzing your responses</p>
          </div>
        </div>
      )}
    </div>
  );
}
