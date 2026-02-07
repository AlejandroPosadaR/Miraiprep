import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, X, Brain, MessageSquare, Lightbulb, Target, Loader2 } from "lucide-react";
import type { EvaluationResult } from "@/services/api";

interface InterviewEvaluationModalProps {
  showEvaluation: boolean;
  evaluation: EvaluationResult | null;
  evaluating: boolean;
  onClose: () => void;
}

export function InterviewEvaluationModal({
  showEvaluation,
  evaluation,
  evaluating,
  onClose,
}: InterviewEvaluationModalProps) {
  const navigate = useNavigate();

  const handleClose = () => {
    onClose();
    navigate("/dashboard");
  };

  if (evaluating) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-violet-500" />
          <h3 className="text-xl font-bold mb-2">Evaluating your interview...</h3>
          <p className="text-muted-foreground">Our AI is analyzing your responses</p>
        </div>
      </div>
    );
  }

  if (!showEvaluation || !evaluation) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-2xl shadow-xl my-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Interview Complete!</h3>
              <p className="text-muted-foreground">Here&apos;s your performance evaluation</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Overall Score */}
        <div className="text-center mb-8">
          <div className="text-6xl font-bold bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">
            {evaluation.overallScore?.toFixed(1) || "0"}/10
          </div>
          <p className="text-muted-foreground mt-1">Overall Score</p>
        </div>

        {/* Category Scores */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: "Knowledge", value: evaluation.knowledge, icon: Brain, color: "bg-blue-500" },
            { label: "Communication", value: evaluation.communication, icon: MessageSquare, color: "bg-green-500" },
            { label: "Problem Solving", value: evaluation.problemSolving, icon: Lightbulb, color: "bg-amber-500" },
            { label: "Technical Depth", value: evaluation.technicalDepth, icon: Target, color: "bg-purple-500" },
          ].map((cat) => (
            <div key={cat.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <cat.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{cat.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${cat.color} transition-all duration-500`}
                    style={{ width: `${cat.value || 0}%` }}
                  />
                </div>
                <span className="text-sm font-bold w-10 text-right">{cat.value || 0}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Feedback */}
        {evaluation.feedback && (
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-2">Feedback</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{evaluation.feedback}</p>
          </div>
        )}

        {/* Strengths & Areas for Improvement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {evaluation.strengths && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">💪 Strengths</h4>
              <p className="text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap">{evaluation.strengths}</p>
            </div>
          )}
          {evaluation.areasForImprovement && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">📈 Areas to Improve</h4>
              <p className="text-sm text-amber-800 dark:text-amber-300 whitespace-pre-wrap">{evaluation.areasForImprovement}</p>
            </div>
          )}
        </div>

        <Button
          className="w-full bg-gradient-to-r from-violet-500 to-purple-600"
          onClick={handleClose}
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
