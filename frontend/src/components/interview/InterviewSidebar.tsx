import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCamera } from "@/hooks/useCamera";
import { 
  Brain, 
  Waves, 
  Video, 
  VideoOff, 
  Loader2, 
  Clock, 
  Target, 
  Trophy, 
  MessageSquare, 
  FileText, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import type { InterviewSession } from "@/services/api";

const TTS_VOICES = [
  { id: "alloy", name: "Alloy" },
  { id: "echo", name: "Echo" },
  { id: "fable", name: "Fable" },
  { id: "onyx", name: "Onyx" },
  { id: "nova", name: "Nova" },
  { id: "shimmer", name: "Shimmer" },
] as const;

interface InterviewSidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isSpeaking: boolean;
  isListening: boolean;
  selectedVoice: string;
  session: InterviewSession | null;
  messages: unknown[];
  elapsedTime: string;
  connected: boolean;
}

export function InterviewSidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  isSpeaking,
  isListening,
  selectedVoice,
  session,
  messages,
  elapsedTime,
  connected,
}: InterviewSidebarProps) {
  const camera = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && camera.stream) {
      videoRef.current.srcObject = camera.stream;
    }
  }, [camera.stream]);

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
  );
}
