import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  User,
  Play,
  Clock,
  Trophy,
  Target,
  Sparkles,
  ChevronRight,
  Loader2,
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
import { api, type InterviewSession } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const INTERVIEW_TYPES = [
  {
    title: "OOP Concepts",
    interviewType: "OOP",
    description: "Object-oriented programming principles",
    icon: Target,
    color: "from-violet-500 to-purple-600",
  },
  {
    title: "System Design",
    interviewType: "SYSTEM_DESIGN",
    description: "Architecture and design patterns",
    icon: Sparkles,
    color: "from-blue-500 to-cyan-600",
  },
  {
    title: "Behavioral",
    interviewType: "BEHAVIORAL",
    description: "Soft skills and situational questions",
    icon: User,
    color: "from-emerald-500 to-teal-600",
  },
] as const;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getInterviewSessions();
        if (!cancelled) setSessions(list);
      } catch {
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
      });
      toast({ title: "Session started", description: "Redirecting to interview…" });
      navigate(`/interview/${session.id}`);
    } catch (e) {
      toast({
        title: "Failed to start session",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600" />
            <span className="text-xl font-bold">PrepPath</span>
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
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="text-muted-foreground mt-2">
              Ready to ace your next interview? Let&apos;s practice!
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
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">
                  Complete a session to see score
                </p>
              </CardContent>
            </Card>
          </div>

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
                          handleStartSession(
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
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <Card>
              <CardContent className="py-12">
                {loading ? (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-12 w-12 animate-spin mb-4" />
                    <p>Loading…</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity yet.</p>
                    <p className="text-sm">Start a practice session to see your progress here!</p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {sessions.slice(0, 5).map((s) => (
                      <li
                        key={s.id}
                        className="py-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{s.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {s.interviewType} · {s.status}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/interview/${s.id}`)}
                        >
                          Open
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
