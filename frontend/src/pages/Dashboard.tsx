import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  Play,
  Clock,
  Trophy,
  Target,
  Sparkles,
  ChevronRight,
  Loader2,
  X,
  Brain,
  MessageSquare,
  Lightbulb,
  Layers,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { api, type InterviewSession, type EvaluationResult } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const INTERVIEW_TYPES = [
  {
    title: "OOP",
    interviewType: "OOP",
    description: "Object-oriented programming concepts and principles",
    icon: Target,
    color: "from-violet-500 to-purple-600",
  },
  {
    title: "Backend",
    interviewType: "SPRING_BOOT",
    description: "Spring Boot, APIs, databases, and backend architecture",
    icon: Layers,
    color: "from-green-500 to-emerald-600",
  },
  {
    title: "Fullstack",
    interviewType: "FULLSTACK",
    description: "End-to-end system design and implementation",
    icon: Brain,
    color: "from-fuchsia-500 to-pink-600",
  },
] as const;

const PAGE_SIZE = 5;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [experienceYears, setExperienceYears] = useState(2);
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

  const getScoreColor = (score: number, max: number = 10) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (percentage >= 60) return "text-blue-600 dark:text-blue-400";
    if (percentage >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProgressColor = (score: number, max: number = 10) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return "bg-emerald-500";
    if (percentage >= 60) return "bg-blue-500";
    if (percentage >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img 
              src="/miraiprep.png" 
              alt="MiraiPrep" 
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-3xl font-bold">
              {user?.firstName}&apos;s Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Practice interviews and track your progress
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Sessions
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    sessions.length
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {sessions.length === 0 ? "Start your first session!" : "Practice sessions"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Practice Time
                </CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0 min</div>
                <p className="text-xs text-muted-foreground">Total practice time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Score
                </CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {(() => {
                  const evaluated = sessions.filter(s => s.evaluationScore != null);
                  if (evaluated.length === 0) {
                    return (
                      <>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">
                          Complete a session to see score
                        </p>
                      </>
                    );
                  }
                  const avg = evaluated.reduce((sum, s) => sum + (s.evaluationScore || 0), 0) / evaluated.length;
                  return (
                    <>
                      <div className={`text-2xl font-bold ${getScoreColor(avg)}`}>
                        {avg.toFixed(1)}/10
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on {evaluated.length} completed session{evaluated.length !== 1 ? "s" : ""}
                      </p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Message Limit Banner */}
          {user?.remainingMessages !== undefined && (
            <Card className={`border-2 ${
              user.remainingMessages === 0 
                ? "border-red-500 bg-red-50 dark:bg-red-900/20" 
                : user.remainingMessages <= 5 
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                  : "border-violet-500/30 bg-violet-50 dark:bg-violet-900/20"
            }`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    {user.remainingMessages === 0 ? (
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    ) : user.remainingMessages <= 5 ? (
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Zap className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    )}
                    <div>
                      <p className="font-medium">
                        {user.remainingMessages === 0 
                          ? "You've reached your message limit" 
                          : `${user.remainingMessages} messages remaining`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.tier === "FREE" ? (
                          <>Free tier: {user.messageCount || 0}/{user.messageLimit || 20} messages used</>
                        ) : (
                          <>{user.tier} tier: {user.messageCount || 0}/{user.messageLimit} messages used</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          user.remainingMessages === 0 
                            ? "bg-red-500" 
                            : user.remainingMessages <= 5 
                              ? "bg-amber-500" 
                              : "bg-violet-500"
                        }`}
                        style={{ width: `${((user.messageCount || 0) / (user.messageLimit || 20)) * 100}%` }}
                      />
                    </div>
                    {user.remainingMessages === 0 && (
                      <Link to="/pricing">
                        <Button size="sm" className="bg-gradient-to-r from-violet-500 to-purple-600">
                          Upgrade
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-4">Start a Practice Session</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {INTERVIEW_TYPES.map((type, index) => (
                <motion.div
                  key={type.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-all group">
                    <CardHeader>
                      <div
                        className={`w-12 h-12 rounded-lg bg-gradient-to-r ${type.color} flex items-center justify-center mb-4`}
                      >
                        <type.icon className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="flex items-center justify-between">
                        {type.title}
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </CardTitle>
                      <CardDescription>{type.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        className={`w-full bg-gradient-to-r ${type.color}`}
                        disabled={!!starting}
                        onClick={() =>
                          openExperienceModal(
                            type.interviewType,
                            `${type.title} – ${new Date().toLocaleDateString()}`
                          )
                        }
                      >
                        {starting === type.interviewType ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Start Session"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Activity</h2>
              {totalCount > 0 && (
                <span className="text-sm text-muted-foreground">
                  Showing {sessions.length} of {totalCount} sessions
                </span>
              )}
            </div>
            <Card>
              <CardContent className="py-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-6">
                    <Loader2 className="h-12 w-12 animate-spin mb-4" />
                    <p>Loading…</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity yet.</p>
                    <p className="text-sm">Start a practice session to see your progress here!</p>
                  </div>
                ) : (
                  <>
                    <ul className="divide-y">
                      {sessions.map((s) => (
                        <li
                          key={s.id}
                          className="py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-4 px-4 rounded-lg cursor-pointer transition-colors"
                          onClick={() => handleSessionClick(s)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${
                              s.status === "COMPLETED" ? "bg-emerald-500" :
                              s.status === "STARTED" || s.status === "PENDING" ? "bg-blue-500" :
                              "bg-slate-400"
                            }`} />
                            <div>
                              <p className="font-medium">{s.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {s.interviewType} · {s.status}
                                {s.evaluationScore != null && (
                                  <span className={`ml-2 font-medium ${getScoreColor(s.evaluationScore)}`}>
                                    Score: {s.evaluationScore.toFixed(1)}/10
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {s.status === "COMPLETED" && (
                              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Completed
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSessionClick(s);
                              }}
                            >
                              {s.status === "COMPLETED" ? "View Summary" : "Continue"}
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    
                    {hasMore && (
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={() => loadSessions(nextCursor || undefined)}
                          disabled={loadingMore}
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Loading…
                            </>
                          ) : (
                            <>
                              Load More
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>

      {/* Interview Setup Modal */}
      {showExperienceModal && selectedType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-2xl shadow-xl my-4"
          >
            <h3 className="text-xl font-bold mb-2">Set Up Your Interview</h3>
            <p className="text-muted-foreground mb-6">
              Customize your practice session for the best experience.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left column - Experience Level */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-violet-500" />
                  Experience Level
                </h4>
                <div className="space-y-2">
                  {[
                    { years: 0, label: "Entry Level (0-1 years)", desc: "Fundamentals" },
                    { years: 2, label: "Mid Level (2-3 years)", desc: "Practical" },
                    { years: 5, label: "Senior (4-6 years)", desc: "Architecture" },
                    { years: 8, label: "Staff+ (7+ years)", desc: "Strategic" },
                  ].map((level) => (
                    <button
                      key={level.years}
                      onClick={() => setExperienceYears(level.years)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        experienceYears === level.years
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-violet-300"
                      }`}
                    >
                      <div className="font-medium text-sm">{level.label}</div>
                      <div className="text-xs text-muted-foreground">{level.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right column - Job Description */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Job Description (Optional)
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Paste a job description to tailor questions to a specific role.
                </p>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste job description here...&#10;&#10;e.g., 'We are looking for a Senior Backend Engineer with experience in Java, Spring Boot, microservices...'"
                  className="w-full h-48 p-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-transparent resize-none text-sm focus:border-violet-500 focus:outline-none transition-colors"
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {jobDescription.length}/5000
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowExperienceModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600"
                disabled={!!starting}
                onClick={() =>
                  handleStartSession(selectedType.interviewType, selectedType.title)
                }
              >
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Interview"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Performance Summary Modal */}
      {showSummaryModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-3xl shadow-xl my-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold">Interview Performance Summary</h3>
                <p className="text-muted-foreground text-sm">{selectedSession.title}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowSummaryModal(false);
                  setSelectedSession(null);
                  setEvaluation(null);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {loadingEvaluation ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-violet-600 mb-4" />
                <p className="text-muted-foreground">Analyzing your interview performance…</p>
                <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
              </div>
            ) : evaluation ? (
              <div className="space-y-6">
                {/* Overall Score and Average */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="text-center p-6 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl">
                    <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
                    <div className={`text-5xl font-bold ${getScoreColor(evaluation.overallScore)}`}>
                      {evaluation.overallScore.toFixed(1)}
                      <span className="text-2xl text-muted-foreground">/10</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {evaluation.overallScore >= 8 ? "Excellent performance! 🎉" :
                       evaluation.overallScore >= 6 ? "Good job! Room for improvement." :
                       evaluation.overallScore >= 4 ? "Keep practicing to improve." :
                       "Needs significant improvement."}
                    </p>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl">
                    <p className="text-sm text-muted-foreground mb-2">Average Category Score</p>
                    {(() => {
                      const avg = (
                        evaluation.knowledge +
                        evaluation.communication +
                        evaluation.problemSolving +
                        evaluation.technicalDepth
                      ) / 4;
                      return (
                        <>
                          <div className={`text-5xl font-bold ${getScoreColor(avg, 100)}`}>
                            {avg.toFixed(1)}
                            <span className="text-2xl text-muted-foreground">/100</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            {avg >= 80 ? "Excellent performance! 🎉" :
                             avg >= 60 ? "Good job! Room for improvement." :
                             avg >= 40 ? "Keep practicing to improve." :
                             "Needs significant improvement."}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Category Scores */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: "knowledge", label: "Knowledge", icon: Brain, value: evaluation.knowledge },
                    { key: "communication", label: "Communication", icon: MessageSquare, value: evaluation.communication },
                    { key: "problemSolving", label: "Problem Solving", icon: Lightbulb, value: evaluation.problemSolving },
                    { key: "technicalDepth", label: "Technical Depth", icon: Layers, value: evaluation.technicalDepth },
                  ].map((category) => (
                    <div key={category.key} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <category.icon className="h-4 w-4 text-violet-500" />
                        <span className="text-xs font-medium text-muted-foreground">{category.label}</span>
                      </div>
                      <div className={`text-2xl font-bold ${getScoreColor(category.value, 100)}`}>
                        {category.value}/100
                      </div>
                      <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getProgressColor(category.value, 100)} transition-all duration-500`}
                          style={{ width: `${category.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feedback */}
                {evaluation.feedback && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4 text-violet-500" />
                      Detailed Feedback
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {evaluation.feedback}
                    </p>
                  </div>
                )}

                {/* Strengths & Areas for Improvement */}
                <div className="grid md:grid-cols-2 gap-4">
                  {evaluation.strengths && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <TrendingUp className="h-4 w-4" />
                        Strengths
                      </h4>
                      <p className="text-sm text-emerald-800 dark:text-emerald-200 whitespace-pre-wrap">
                        {evaluation.strengths}
                      </p>
                    </div>
                  )}
                  {evaluation.areasForImprovement && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                        <TrendingDown className="h-4 w-4" />
                        Areas to Improve
                      </h4>
                      <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">
                        {evaluation.areasForImprovement}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowSummaryModal(false);
                      setSelectedSession(null);
                      setEvaluation(null);
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600"
                    onClick={() => navigate(`/interview/${selectedSession.id}`)}
                  >
                    View Full Interview
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No evaluation data available.</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
