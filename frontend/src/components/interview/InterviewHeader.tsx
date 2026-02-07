import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  ArrowLeft, 
  Mic, 
  Phone, 
  Loader2, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Zap, 
  Waves, 
  Gauge 
} from "lucide-react";
import type { InterviewSession } from "@/services/api";

interface InterviewHeaderProps {
  isSpeaking: boolean;
  isProcessing: boolean;
  isListening: boolean;
  useOpenAIStt: boolean;
  useOpenAITts: boolean;
  ttsEnabled: boolean;
  ttsSupported: boolean;
  speakingSpeed: number;
  session: InterviewSession | null;
  ending: boolean;
  didShowTtsUnsupportedToast: boolean;
  onBack: () => void;
  onToggleStt: () => void;
  onToggleTts: () => void;
  onToggleTtsEnabled: () => void;
  onSpeedChange: (speed: number) => void;
  onEndInterview: () => void;
  onStopListening: () => Promise<void>;
  onResetStt: () => void;
  onCancelSpeech: () => void;
  onShowTtsUnsupportedToast: () => void;
}

export function InterviewHeader({
  isSpeaking,
  isProcessing,
  isListening,
  useOpenAIStt,
  useOpenAITts,
  ttsEnabled,
  ttsSupported,
  speakingSpeed,
  session,
  ending,
  didShowTtsUnsupportedToast,
  onBack,
  onToggleStt,
  onToggleTts,
  onToggleTtsEnabled,
  onSpeedChange,
  onEndInterview,
  onStopListening,
  onResetStt,
  onCancelSpeech,
  onShowTtsUnsupportedToast,
}: InterviewHeaderProps) {
  return (
    <header className="h-14 border-b flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="font-medium hidden sm:inline">Interview</span>
        {/* Status indicators */}
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
          {/* STT Quality Toggle */}
          <Button
            variant={useOpenAIStt ? "secondary" : "ghost"}
            size="sm"
            onClick={async () => {
              if (isListening) {
                await onStopListening();
              }
              onResetStt();
              onToggleStt();
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

          {/* TTS Quality Toggle */}
          <Button
            variant={useOpenAITts ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleTts}
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

          {/* TTS Toggle */}
          <Button
            variant={ttsEnabled ? (isSpeaking ? "default" : "secondary") : "ghost"}
            size="sm"
            onClick={() => {
              if (!ttsSupported) {
                if (!didShowTtsUnsupportedToast) {
                  onShowTtsUnsupportedToast();
                }
                return;
              }
              if (ttsEnabled && isSpeaking) {
                onCancelSpeech();
              }
              onToggleTtsEnabled();
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

          {/* Speed Control */}
          {ttsEnabled && (
            <div className="flex items-center gap-1.5 px-2 border-l border-border/50">
              <Gauge className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <Slider
                value={[speakingSpeed]}
                onValueChange={(value) => onSpeedChange(value[0])}
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
          onClick={onEndInterview}
          title={session?.status === "COMPLETED" ? "Interview already completed" : "End interview"}
        >
          {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4 mr-2 rotate-[135deg]" />}
          {session?.status === "COMPLETED" ? "Completed" : "End Interview"}
        </Button>
      </div>
    </header>
  );
}
