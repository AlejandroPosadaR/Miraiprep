import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Send, Loader2, AlertCircle } from "lucide-react";

interface InterviewInputProps {
  input: string;
  setInput: (value: string) => void;
  sending: boolean;
  connected: boolean;
  isListening: boolean;
  isProcessing: boolean;
  sttSupported: boolean;
  useOpenAIStt: boolean;
  didShowSttUnsupportedToast: boolean;
  messageLimitReached?: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onMicClick: () => Promise<void>;
  onShowSttUnsupportedToast: () => void;
}

export function InterviewInput({
  input,
  setInput,
  sending,
  connected,
  isListening,
  isProcessing,
  sttSupported,
  useOpenAIStt,
  didShowSttUnsupportedToast,
  messageLimitReached,
  onInputChange,
  onSend,
  onMicClick,
  onShowSttUnsupportedToast,
}: InterviewInputProps) {
  // Show message limit banner if limit reached
  if (messageLimitReached) {
    return (
      <div className="p-4 border-t bg-red-50 dark:bg-red-900/20 flex flex-col gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Message limit reached</p>
            <p className="text-sm opacity-80">You've used all your free messages. Upgrade to continue practicing.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/pricing" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-violet-500 to-purple-600">
              Upgrade Plan
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t bg-background flex gap-2 flex-shrink-0">
      {/* Enhanced Mic Button */}
      <div className="relative">
        <Button
          type="button"
          variant={isListening ? "default" : isProcessing ? "secondary" : "outline"}
          size="icon"
          disabled={sending || !connected || isProcessing}
          onClick={async () => {
            if (!sttSupported) {
              if (!didShowSttUnsupportedToast) {
                onShowSttUnsupportedToast();
              }
              return;
            }
            await onMicClick();
          }}
          className={`relative h-10 w-10 ${
            isListening 
              ? "bg-green-600 hover:bg-green-700 text-white animate-pulse shadow-lg shadow-green-500/50" 
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
              <Mic className="h-4 w-4" />
              <span className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
            </>
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        {/* Status indicator */}
        {isListening && (
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
        )}
        {isProcessing && (
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full border-2 border-background animate-pulse" />
        )}
      </div>

      {/* Input with visual feedback */}
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
          onChange={(e) => {
            setInput(e.target.value);
            onInputChange(e.target.value);
          }}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
          disabled={sending || !connected}
          className={`transition-all ${
            isListening 
              ? "border-green-500 bg-green-50 dark:bg-green-950/20 shadow-sm" 
              : isProcessing 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                : ""
          }`}
        />
        {/* Visual waveform indicator when listening */}
        {isListening && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <div className="h-1 w-1 bg-green-500 rounded-full animate-pulse [animation-delay:0ms]" />
            <div className="h-1.5 w-1 bg-green-500 rounded-full animate-pulse [animation-delay:150ms]" />
            <div className="h-2 w-1 bg-green-500 rounded-full animate-pulse [animation-delay:300ms]" />
            <div className="h-1.5 w-1 bg-green-500 rounded-full animate-pulse [animation-delay:450ms]" />
            <div className="h-1 w-1 bg-green-500 rounded-full animate-pulse [animation-delay:600ms]" />
          </div>
        )}
      </div>

      {/* Send button */}
      <Button 
        onClick={onSend} 
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
  );
}
