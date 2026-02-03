import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  MessageSquare, 
  Clock, 
  ChevronRight,
  Sparkles,
  Brain,
  Volume2,
  Settings,
  Maximize2,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

const InterviewDemo = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const questions = [
    "Tell me about yourself and your background.",
    "Why are you interested in this position?",
    "Describe a challenging project you've worked on.",
    "How do you handle tight deadlines?",
    "Where do you see yourself in 5 years?"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="h-16 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between px-6">
        <Link to="/" className="flex items-center">
          <img 
            src="/miraiprep.png" 
            alt="MiraiPrep" 
            className="h-8 w-auto"
          />
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">23:45</span>
          </div>
          <span className="text-sm text-muted-foreground">Question {currentQuestion + 1} of {questions.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Main Interview Area */}
        <div className="flex-1 p-6 flex flex-col gap-6">
          {/* Video Grid */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            {/* AI Interviewer */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-accent/10 to-secondary border border-border"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <motion.div 
                    animate={{ 
                      boxShadow: ["0 0 0 0 hsl(var(--primary)/0.4)", "0 0 0 20px hsl(var(--primary)/0)", "0 0 0 0 hsl(var(--primary)/0.4)"]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4"
                  >
                    <Brain className="w-16 h-16 text-primary-foreground" />
                  </motion.div>
                  <h3 className="text-xl font-display font-bold text-foreground">AI Interviewer</h3>
                  <p className="text-sm text-muted-foreground mt-1">Senior Technical Recruiter</p>
                </div>
              </div>
              
              {/* Speaking Indicator */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-background/80 backdrop-blur-sm rounded-full">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-primary"
                />
                <span className="text-xs font-medium">Speaking...</span>
              </div>
            </motion.div>

            {/* User Video */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="relative rounded-2xl overflow-hidden bg-secondary/50 border border-border"
            >
              {isVideoOn ? (
                <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                    <span className="text-3xl font-bold text-muted-foreground">You</span>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-secondary flex items-center justify-center">
                  <VideoOff className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              
              <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-background/80 backdrop-blur-sm rounded-full">
                <span className="text-xs font-medium">You</span>
              </div>
            </motion.div>
          </div>

          {/* Current Question */}
          <motion.div 
            key={currentQuestion}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-2">Current Question</p>
                <p className="text-lg font-medium text-foreground">{questions[currentQuestion]}</p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0">
                <RotateCcw className="w-4 h-4 mr-2" />
                Repeat
              </Button>
            </div>
          </motion.div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button 
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            
            <Button 
              variant={!isVideoOn ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={() => setIsVideoOn(!isVideoOn)}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            <Button 
              variant="destructive"
              size="lg"
              className="rounded-full px-8"
            >
              <Phone className="w-5 h-5 mr-2 rotate-[135deg]" />
              End Interview
            </Button>

            <Button 
              variant="secondary"
              size="lg"
              className="rounded-full w-14 h-14"
            >
              <Volume2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Sidebar - Live Feedback */}
        <div className="w-80 border-l border-border bg-card/30 p-6 flex flex-col gap-6">
          <div>
            <h3 className="font-display font-bold text-foreground mb-4">Live Analysis</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Confidence</span>
                  <span className="text-sm font-medium text-primary">85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Clarity</span>
                  <span className="text-sm font-medium text-primary">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Pace</span>
                  <span className="text-sm font-medium text-accent">78%</span>
                </div>
                <Progress value={78} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Eye Contact</span>
                  <span className="text-sm font-medium text-primary">88%</span>
                </div>
                <Progress value={88} className="h-2" />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="font-display font-bold text-foreground mb-4">Real-time Tips</h3>
            
            <div className="space-y-3">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-xl bg-primary/10 border border-primary/20"
              >
                <p className="text-sm text-foreground">💡 Great eye contact! Keep it up.</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="p-3 rounded-xl bg-secondary border border-border"
              >
                <p className="text-sm text-foreground">🎯 Try to include more specific examples.</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="p-3 rounded-xl bg-secondary border border-border"
              >
                <p className="text-sm text-foreground">⏱️ You're speaking at a good pace.</p>
              </motion.div>
            </div>
          </div>

          <div className="border-t border-border pt-6 mt-auto">
            <h3 className="font-display font-bold text-foreground mb-4">Progress</h3>
            <div className="flex gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQuestion(i)}
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    i <= currentQuestion ? 'bg-primary' : 'bg-secondary'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <Button 
                variant="ghost" 
                size="sm"
                disabled={currentQuestion === 0}
                onClick={() => setCurrentQuestion(c => c - 1)}
              >
                Previous
              </Button>
              <Button 
                variant="default" 
                size="sm"
                disabled={currentQuestion === questions.length - 1}
                onClick={() => setCurrentQuestion(c => c + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewDemo;
