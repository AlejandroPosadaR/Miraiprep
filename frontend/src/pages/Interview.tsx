import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { api, WS_BASE_URL, type Message } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Phone, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

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
  const clientRef = useRef<Client | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const syncedCompletionsRef = useRef<Set<string>>(new Set());
  const deltaBufferRef = useRef<Map<string, string>>(new Map());
  const flushTimerRef = useRef<number | null>(null);

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

  const syncOnceOnComplete = async (interviewerMessageId: string) => {
    if (!sessionId) return;
    if (syncedCompletionsRef.current.has(interviewerMessageId)) return;
    syncedCompletionsRef.current.add(interviewerMessageId);
    try {
      const list = await api.getMessages(sessionId, { limit: 200 });
      setMessages(list);
    } catch {
      // don't toast spam; UI already has the content from WS
    }
  };

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
              return;
            }

            if (evt.type === "ai_complete") {
              // One and only one GET (per interviewer message) once the model is done.
              // Avoids hammering the backend during streaming.
              void syncOnceOnComplete(evt.interviewerMessageId);
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

  const handleEndInterview = async () => {
    if (!sessionId || ending) return;
    setEnding(true);
    try {
      await api.abortSession(sessionId);
      toast({ title: "Interview ended" });
      navigate("/dashboard");
    } catch (e) {
      toast({
        title: "Failed to end interview",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setEnding(false);
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
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="font-medium">Interview</span>
          {connected ? (
            <span className="text-xs text-emerald-600">Connected</span>
          ) : (
            <span className="text-xs text-amber-600">Connecting…</span>
          )}
        </div>
        <Button
          variant="destructive"
          size="sm"
          disabled={ending}
          onClick={handleEndInterview}
        >
          {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4 mr-2 rotate-[135deg]" />}
          End Interview
        </Button>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
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
                {m.content ? (
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
                ) : m.role === "INTERVIEWER" ? (
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

      <div className="p-4 border-t flex gap-2">
        <Input
          placeholder="Type your message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={sending || !connected}
        />
        <Button onClick={sendMessage} disabled={sending || !connected || !input.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
