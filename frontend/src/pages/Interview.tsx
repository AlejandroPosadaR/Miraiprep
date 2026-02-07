import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import { useAuth } from "@/contexts/AuthContext";
import { api, WS_BASE_URL, type Message, type EvaluationResult, type InterviewSession } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useInterviewTts } from "@/hooks/useInterviewTts";
import { useUnifiedStt } from "@/hooks/useUnifiedStt";
import { InterviewSidebar } from "@/components/interview/InterviewSidebar";
import { InterviewHeader } from "@/components/interview/InterviewHeader";
import { InterviewMessages } from "@/components/interview/InterviewMessages";
import { InterviewInput } from "@/components/interview/InterviewInput";
import { InterviewEvaluationModal } from "@/components/interview/InterviewEvaluationModal";
import type { SessionTopicEvent } from "@/types/interview";

export default function Interview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [connected, setConnected] = useState(false);
  const [messageLimitReached, setMessageLimitReached] = useState(false);
  const [didShowSttUnsupportedToast, setDidShowSttUnsupportedToast] = useState(false);
  const [didShowTtsUnsupportedToast, setDidShowTtsUnsupportedToast] = useState(false);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [interviewStartTime] = useState(() => Date.now());
  const [elapsedTime, setElapsedTime] = useState("00:00");

  const clientRef = useRef<Client | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const syncedCompletionsRef = useRef<Set<string>>(new Set());
  const deltaBufferRef = useRef<Map<string, string>>(new Map());
  const flushTimerRef = useRef<number | null>(null);

  // TTS Hook
  const {
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
  } = useInterviewTts();

  // STT Hook
  const {
    useOpenAIStt,
    setUseOpenAIStt,
    sttSupported,
    isListening,
    isProcessing,
    sttError,
    startListening,
    stopListening,
    resetStt,
    sttActiveRef,
    lastDisplayedRef,
    webStt,
    getCombinedWebSttTranscript,
  } = useUnifiedStt({
    onTranscriptChange: (text) => setInput(text),
  });

  // Keep cancelSpeech in a ref to avoid dependency issues
  const cancelSpeechRef = useRef(cancelSpeech);
  useEffect(() => {
    cancelSpeechRef.current = cancelSpeech;
  }, [cancelSpeech]);

  // Sync STT transcript into input - prevent duplication (Web Speech API only)
  useEffect(() => {
    if (!useOpenAIStt) {
      if (isListening) {
        const combined = getCombinedWebSttTranscript();
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
    }
  }, [isListening, webStt.finalTranscript, webStt.interimTranscript, useOpenAIStt, getCombinedWebSttTranscript, lastDisplayedRef]);

  // Surface STT errors
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
  }, [sttError, stopListening, toast, sttActiveRef]);

  // Stop TTS when user starts speaking
  useEffect(() => {
    if (isListening && isSpeaking) {
      cancelSpeechRef.current();
    }
  }, [isListening, isSpeaking]);

  // Load messages
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
    return () => { cancelled = true; };
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
        // Session info is optional
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

  // Sync on complete
  const syncOnceOnComplete = useCallback(
    async (interviewerMessageId: string) => {
      if (!sessionId) return;
      if (syncedCompletionsRef.current.has(interviewerMessageId)) return;
      syncedCompletionsRef.current.add(interviewerMessageId);
      try {
        const list = await api.getMessages(sessionId, { limit: 200 });
        setMessages(list);
      } catch {
        // don't toast spam
      }
    },
    [sessionId]
  );

  const syncOnceOnCompleteRef = useRef(syncOnceOnComplete);
  useEffect(() => {
    syncOnceOnCompleteRef.current = syncOnceOnComplete;
  }, [syncOnceOnComplete]);

  // Store refs for WebSocket callbacks
  const speakAiResponseRef = useRef(speakAiResponse);
  useEffect(() => {
    speakAiResponseRef.current = speakAiResponse;
  }, [speakAiResponse]);

  // Delta flush
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

  // WebSocket connection
  useEffect(() => {
    if (!sessionId || !user?.userId) return;
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
              const id = evt.interviewerMessageId;
              const existing = deltaBufferRef.current.get(id) || "";
              deltaBufferRef.current.set(id, existing + delta);
              scheduleDeltaFlush();

              // Stream TTS
              if (ttsEnabledRef.current && ttsSupportedRef.current) {
                const streamBuffer = ttsStreamBufferRef.current.get(id) || "";
                const updatedBuffer = streamBuffer + delta;
                const { chunks, remaining } = extractSpeakableChunks(updatedBuffer);
                if (chunks.length > 0) {
                  chunks.forEach((chunk) => enqueueTts(chunk, id));
                  spokenMessagesRef.current.add(id);
                }
                ttsStreamBufferRef.current.set(id, remaining);
              }
              return;
            }

            if (evt.type === "ai_complete") {
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
              setMessages((prev) => prev.filter((m) => !m.id.startsWith("opt-")));
              setMessageLimitReached(true);
              toast({
                title: "Message limit reached",
                description: `You have used ${evt.messageCount} of ${evt.messageLimit} messages on the ${evt.tier} tier. Upgrade to continue.`,
                variant: "destructive",
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
    if (!text || !sessionId || !user?.userId || sending || messageLimitReached) return;
    setSending(true);
    setInput("");
    lastDisplayedRef.current = "";
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

  return (
    <div className="h-screen flex bg-background overflow-hidden">
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
