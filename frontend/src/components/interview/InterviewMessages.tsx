import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Loader2 } from "lucide-react";
import type { Message } from "@/services/api";

interface InterviewMessagesProps {
  messages: Message[];
  loading: boolean;
}

export function InterviewMessages({ messages, loading }: InterviewMessagesProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
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
  );
}
