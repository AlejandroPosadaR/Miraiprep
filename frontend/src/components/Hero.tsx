import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "./ui/button";
import { ArrowRight, Sparkles, Check, UserRound, Loader2, Github } from "lucide-react";
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

          {/* Right - Floating cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            {/* Main card */}
            <div className="relative bg-card rounded-3xl p-8 shadow-2xl border border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-accent" />
              </div>
              
              <div className="space-y-4">
                <div className="h-4 w-3/4 rounded-full bg-muted" />
                <div className="h-4 w-full rounded-full bg-muted" />
                <div className="h-4 w-5/6 rounded-full bg-muted" />
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/10">
                <p className="text-sm font-medium text-foreground mb-2">AI Feedback</p>
                <p className="text-xs text-muted-foreground">Great structure! Consider adding more specific examples...</p>
              </div>
            </div>

            {/* Floating stat cards */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 bg-card rounded-2xl p-4 shadow-xl border border-border"
            >
              <p className="text-2xl font-bold text-gradient">92%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-4 -left-8 bg-card rounded-2xl p-4 shadow-xl border border-border"
            >
              <p className="text-2xl font-bold text-foreground">50K+</p>
              <p className="text-xs text-muted-foreground">Interviews Done</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
