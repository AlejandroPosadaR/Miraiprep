import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  X,
  Brain,
  MessageSquare,
  Lightbulb,
  Layers,
  TrendingUp,
  TrendingDown,
  Target,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InterviewSession, EvaluationResult } from "@/services/api";

interface PerformanceSummaryModalProps {
  session: InterviewSession;
  evaluation: EvaluationResult | null;
  loading: boolean;
  onClose: () => void;
}

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

export function PerformanceSummaryModal({
  session,
  evaluation,
  loading,
  onClose,
}: PerformanceSummaryModalProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-3xl shadow-xl my-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold">Interview Performance Summary</h3>
            <p className="text-muted-foreground text-sm">{session.title}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {loading ? (
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
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Close
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600"
                onClick={() => navigate(`/interview/${session.id}`)}
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
  );
}
