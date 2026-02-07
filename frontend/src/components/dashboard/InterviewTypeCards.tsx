import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INTERVIEW_TYPES } from "@/constants/interviewTypes";

interface InterviewTypeCardsProps {
  starting: string | null;
  onStartSession: (interviewType: string, title: string) => void;
}

export function InterviewTypeCards({ starting, onStartSession }: InterviewTypeCardsProps) {
  return (
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
                    onStartSession(
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
  );
}
