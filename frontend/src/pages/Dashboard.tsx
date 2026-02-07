import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, type InterviewSession, type EvaluationResult } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import {
  DashboardHeader,
  DashboardStats,
  MessageLimitBanner,
  InterviewTypeCards,
  RecentSessions,
  InterviewSetupModal,
  PerformanceSummaryModal,
} from "@/components/dashboard";

const PAGE_SIZE = 5;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [experienceYears, setExperienceYears] = useState(3);
  const [jobDescription, setJobDescription] = useState("");
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [selectedType, setSelectedType] = useState<{ interviewType: string; title: string } | null>(null);

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedSession, setSelectedSession] = useState<InterviewSession | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  const loadSessions = useCallback(async (cursor?: string) => {
    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await api.getInterviewSessionsPaginated({ cursor, limit: PAGE_SIZE });
      if (cursor) {
        setSessions(prev => [...prev, ...response.sessions]);
      } else {
        setSessions(response.sessions);
      }
      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
      setTotalCount(response.totalCount);
    } catch {
      if (!cursor) setSessions([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleStartSession = async (interviewType: string, title: string) => {
    if (!user?.userId) {
      toast({ title: "Error", description: "User not found.", variant: "destructive" });
      return;
    }
    setStarting(interviewType);
    try {
      const session = await api.createInterviewSession({
        userId: user.userId,
        title,
        interviewType,
        experienceYears,
        jobDescription: jobDescription.trim() || undefined,
      });
      toast({ title: "Session started", description: "Redirecting to interview…" });
      navigate(`/interview/${session.id}`);
    } catch (e) {
      toast({
        title: "Couldn't start session",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setStarting(null);
      setShowExperienceModal(false);
      setJobDescription("");
    }
  };

  const openExperienceModal = (interviewType: string, title: string) => {
    setSelectedType({ interviewType, title });
    setJobDescription("");
    setShowExperienceModal(true);
  };

  const handleSessionClick = async (session: InterviewSession) => {
    if (session.status === "COMPLETED") {
      setSelectedSession(session);
      setShowSummaryModal(true);

      if (session.evaluatedAt && session.evaluationScore != null) {
        setEvaluation({
          overallScore: session.evaluationScore,
          knowledge: session.evaluationKnowledge || 0,
          communication: session.evaluationCommunication || 0,
          problemSolving: session.evaluationProblemSolving || 0,
          technicalDepth: session.evaluationTechnicalDepth || 0,
          feedback: session.evaluationFeedback || "",
        });
      } else {
        setLoadingEvaluation(true);
        setEvaluation(null);
        try {
          const result = await api.evaluateInterview(session.id);
          setEvaluation(result);
          setSessions(prev => prev.map(s =>
            s.id === session.id
              ? {
                  ...s,
                  evaluationScore: result.overallScore,
                  evaluationKnowledge: result.knowledge,
                  evaluationCommunication: result.communication,
                  evaluationProblemSolving: result.problemSolving,
                  evaluationTechnicalDepth: result.technicalDepth,
                  evaluationFeedback: result.feedback,
                  evaluatedAt: new Date().toISOString(),
                }
              : s
          ));
        } catch (e) {
          toast({
            title: "Couldn't load evaluation",
            description: e instanceof Error ? e.message : undefined,
            variant: "destructive",
          });
        } finally {
          setLoadingEvaluation(false);
        }
      }
    } else {
      navigate(`/interview/${session.id}`);
    }
  };

  const closeSummaryModal = () => {
    setShowSummaryModal(false);
    setSelectedSession(null);
    setEvaluation(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <DashboardHeader user={user} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="text-muted-foreground mt-2">
              Ready to ace your next interview? Let&apos;s practice!
            </p>
          </div>

          <DashboardStats sessions={sessions} loading={loading} />

          <MessageLimitBanner user={user} />

          <InterviewTypeCards
            starting={starting}
            onStartSession={openExperienceModal}
          />

          <RecentSessions
            sessions={sessions}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            totalCount={totalCount}
            onLoadMore={() => loadSessions(nextCursor || undefined)}
            onSessionClick={handleSessionClick}
          />
        </motion.div>
      </main>

      {/* Interview Setup Modal */}
      {showExperienceModal && selectedType && (
        <InterviewSetupModal
          selectedType={selectedType}
          experienceYears={experienceYears}
          setExperienceYears={setExperienceYears}
          jobDescription={jobDescription}
          setJobDescription={setJobDescription}
          starting={starting}
          onStart={() => handleStartSession(selectedType.interviewType, selectedType.title)}
          onClose={() => setShowExperienceModal(false)}
        />
      )}

      {/* Performance Summary Modal */}
      {showSummaryModal && selectedSession && (
        <PerformanceSummaryModal
          session={selectedSession}
          evaluation={evaluation}
          loading={loadingEvaluation}
          onClose={closeSummaryModal}
        />
      )}
    </div>
  );
}
