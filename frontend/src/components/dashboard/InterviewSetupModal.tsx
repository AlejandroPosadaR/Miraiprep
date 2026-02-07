import { motion } from "framer-motion";
import { Loader2, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EXPERIENCE_LEVELS } from "@/constants/experienceLevels";

interface InterviewSetupModalProps {
  selectedType: { interviewType: string; title: string };
  experienceYears: number;
  setExperienceYears: (years: number) => void;
  jobDescription: string;
  setJobDescription: (desc: string) => void;
  starting: string | null;
  onStart: () => void;
  onClose: () => void;
}

export function InterviewSetupModal({
  selectedType,
  experienceYears,
  setExperienceYears,
  jobDescription,
  setJobDescription,
  starting,
  onStart,
  onClose,
}: InterviewSetupModalProps) {
  return (
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
              {EXPERIENCE_LEVELS.map((level) => (
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
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600"
            disabled={!!starting}
            onClick={onStart}
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Interview"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
