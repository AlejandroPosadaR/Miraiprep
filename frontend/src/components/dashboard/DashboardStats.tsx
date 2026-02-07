import { Clock, Play, Trophy, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterviewSession } from "@/services/api";

interface DashboardStatsProps {
  sessions: InterviewSession[];
  loading: boolean;
}

const getScoreColor = (score: number) => {
  const percentage = (score / 10) * 100;
  if (percentage >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (percentage >= 60) return "text-blue-600 dark:text-blue-400";
  if (percentage >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

export function DashboardStats({ sessions, loading }: DashboardStatsProps) {
  const evaluated = sessions.filter(s => s.evaluationScore != null);
  const avgScore = evaluated.length > 0
    ? evaluated.reduce((sum, s) => sum + (s.evaluationScore || 0), 0) / evaluated.length
    : null;

  return (
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
          {avgScore === null ? (
            <>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">
                Complete a session to see score
              </p>
            </>
          ) : (
            <>
              <div className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>
                {avgScore.toFixed(1)}/10
              </div>
              <p className="text-xs text-muted-foreground">
                Based on {evaluated.length} completed session{evaluated.length !== 1 ? "s" : ""}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
