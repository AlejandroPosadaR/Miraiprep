import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "./ui/button";
import { ArrowRight, Sparkles, Check, UserRound, Loader2, Github, Brain, Waves, Video, Clock, Target, Trophy, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Hero = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);

  const handleTryAsGuest = async () => {
    setIsCreatingGuest(true);
    try {
      const id = crypto.randomUUID().slice(0, 8);
      await register({
        email: `guest-${id}@miraiprep.com`,
        username: `guest-${id}`,
        password: `Guest@${id}!Xk`,
        firstName: "Guest",
        lastName: "User",
      });
      navigate("/dashboard");
    } catch {
      // If the random email collides (extremely unlikely), retry once
      try {
        const id2 = crypto.randomUUID().slice(0, 8);
        await register({
          email: `guest-${id2}@miraiprep.com`,
          username: `guest-${id2}`,
          password: `Guest@${id2}!Xk`,
          firstName: "Guest",
          lastName: "User",
        });
        navigate("/dashboard");
      } catch {
        // Fallback: send them to the register page
        navigate("/register");
      }
    } finally {
      setIsCreatingGuest(false);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 pt-32 pb-20">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-primary/20 to-accent/20 blob animate-spin-slow opacity-60" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-accent/15 to-primary/15 blob animate-spin-slow opacity-50" style={{ animationDirection: 'reverse' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground font-medium">AI-Powered Interview Prep</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.1] mb-6"
            >
              Nail every
              <br />
              <span className="text-gradient">interview</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg text-muted-foreground max-w-md mb-8 leading-relaxed"
            >
              Practice with realistic AI interviews. Get instant feedback. Land your dream job with confidence.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-start gap-4 mb-10"
            >
              <Link to="/register">
                <Button variant="hero" size="lg" className="group shadow-xl shadow-primary/25">
                  Start Practicing
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="group border-primary/30 bg-primary/5 hover:bg-primary/10 text-foreground font-semibold"
                onClick={handleTryAsGuest}
                disabled={isCreatingGuest}
              >
                {isCreatingGuest ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <UserRound className="w-5 h-5 mr-2" />
                )}
                {isCreatingGuest ? "Setting up..." : "Try as Guest"}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="mb-10"
            >
              <a
                href="https://github.com/AlejandroPosadaR/Miraiprep"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-card border-2 border-border hover:border-primary/50 transition-all duration-300 group shadow-lg hover:shadow-xl"
              >
                <Github className="w-6 h-6 text-foreground group-hover:text-primary transition-colors" />
                <div className="text-left">
                  <div className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    View on GitHub
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Open source • Star us ⭐
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-wrap gap-4"
            >
              {["No credit card", "Unlimited practice", "Real-time feedback"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-accent" />
                  </div>
                  {item}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right - Interview Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            <div className="relative bg-card rounded-3xl shadow-2xl border border-border overflow-hidden h-[480px] w-full max-w-[700px] mx-auto flex">
              {/* Left Sidebar */}
              <div className="w-48 border-r border-border bg-muted/20 flex-shrink-0 flex flex-col">
                {/* Video Call Area */}
                <div className="p-3 border-b space-y-3">
                  {/* AI Interviewer Avatar */}
                  <div className="relative">
                    <motion.div 
                      className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg relative"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Brain className="h-8 w-8 text-white" />
                      <motion.div
                        className="absolute inset-0 rounded-full bg-violet-400/30"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.div>
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-violet-500 rounded-full">
                      <Waves className="h-2.5 w-2.5 text-white animate-pulse" />
                      <span className="text-[9px] text-white font-medium">Speaking</span>
                    </div>
                  </div>
                  <p className="text-center text-xs font-semibold">AI Interviewer</p>
                  <p className="text-center text-[10px] text-muted-foreground">Echo</p>

                  {/* Divider */}
                  <div className="border-t pt-3">
                    {/* User Camera View */}
                    <div className="relative">
                      <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-green-500 shadow-lg shadow-green-500/20">
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                            <UserRound className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500 rounded-full">
                          <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                          <span className="text-[9px] text-white font-medium">Listening</span>
                        </div>
                      </div>
                      <p className="text-center text-[10px] text-muted-foreground mt-1.5">You</p>
                      <div className="w-full mt-1.5 px-2 py-1 rounded border border-border bg-background/50 flex items-center gap-1.5">
                        <Video className="h-2.5 w-2.5 text-green-500" />
                        <span className="text-[10px]">Camera On</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interview Info */}
                <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-background border">
                    <Clock className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Duration</p>
                      <p className="font-mono font-semibold text-xs">05:23</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-background border">
                    <Target className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Type</p>
                      <p className="font-medium text-xs truncate">OOP</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-background border">
                    <Trophy className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Level</p>
                      <p className="font-medium text-xs">Mid</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-background border">
                    <MessageSquare className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Messages</p>
                      <p className="font-medium text-xs">6</p>
                    </div>
                  </div>
                </div>

                {/* Connection Status */}
                <div className="p-3 border-t">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-emerald-600">Connected</span>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Browser bar */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                  </div>
                  <div className="flex-1 mx-3">
                    <div className="h-1.5 w-full rounded-full bg-muted/50" />
                  </div>
                </div>

                {/* Interview Header */}
                <div className="px-6 py-3 border-b border-border bg-background">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-3.5 w-28 rounded bg-muted mb-1.5" />
                      <div className="h-2.5 w-20 rounded bg-muted/50" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      </div>
                      <div className="w-7 h-7 rounded bg-muted" />
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden p-4 space-y-3">
                  {/* Interviewer message */}
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-muted">
                      <div className="text-xs opacity-60 mb-1.5">INTERVIEWER</div>
                      <div className="text-sm text-foreground leading-relaxed">
                        <p className="mb-1">Can you explain the difference between a class and an object in object-oriented programming?</p>
                      </div>
                    </div>
                  </div>

                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-primary text-primary-foreground">
                      <div className="text-xs opacity-80 mb-1.5">USER</div>
                      <div className="text-sm leading-relaxed">
                        <p>A class is a blueprint or template that defines the structure and behavior. An object is an instance of a class.</p>
                      </div>
                    </div>
                  </div>

                  {/* Interviewer follow-up */}
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-muted">
                      <div className="text-xs opacity-60 mb-1.5">INTERVIEWER</div>
                      <div className="text-sm text-foreground leading-relaxed">
                        <p className="mb-2">Good! Can you give me an example of how you'd implement encapsulation in Java?</p>
                        <div className="mt-2 p-2 rounded bg-background/80 border border-border/50 font-mono text-xs">
                          <div className="text-primary/70 mb-1">{"public class BankAccount {"}</div>
                          <div className="ml-2 space-y-0.5">
                            <div className="text-muted-foreground">private double balance;</div>
                            <div className="text-muted-foreground">...</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Typing indicator */}
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-muted">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.25s]" />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.1s]" />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="px-4 py-3 border-t border-border bg-background">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg border-2 border-green-500 bg-green-500/10 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <div className="flex-1 h-10 rounded-lg border border-border bg-muted/30" />
                    <div className="w-16 h-10 rounded-lg bg-primary" />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 bg-card rounded-xl px-4 py-2 shadow-xl border border-border"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-foreground">Live Preview</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
