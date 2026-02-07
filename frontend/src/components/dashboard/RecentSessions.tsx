import { Trophy, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { InterviewSession } from "@/services/api";

interface RecentSessionsProps {
  sessions: InterviewSession[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  onLoadMore: () => void;
  onSessionClick: (session: InterviewSession) => void;
}

const getScoreColor = (score: number) => {
  const percentage = (score / 10) * 100;
  if (percentage >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (percentage >= 60) return "text-blue-600 dark:text-blue-400";
  if (percentage >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

export function RecentSessions({
  sessions,
  loading,
  loadingMore,
  hasMore,
  totalCount,
  onLoadMore,
  onSessionClick,
}: RecentSessionsProps) {
  return (
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
                    onClick={() => onSessionClick(s)}
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
                          onSessionClick(s);
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
                    onClick={onLoadMore}
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
  );
}
