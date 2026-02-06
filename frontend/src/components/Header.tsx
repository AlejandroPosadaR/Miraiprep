import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "./ui/button";
import { UserRound, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
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
      navigate("/register");
    } finally {
      setIsCreatingGuest(false);
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between bg-card/70 backdrop-blur-xl rounded-2xl px-6 py-3 border border-border">
        <Link to="/">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <img 
              src="/miraiprep.png" 
              alt="MiraiPrep" 
              className="h-10 w-auto"
            />
          </motion.div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm font-medium">Features</a>
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm font-medium">How it Works</a>
          <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm font-medium">Pricing</Link>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex border-primary/30 bg-primary/5 hover:bg-primary/10 text-foreground font-medium"
            onClick={handleTryAsGuest}
            disabled={isCreatingGuest}
          >
            {isCreatingGuest ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <UserRound className="w-4 h-4 mr-1.5" />
            )}
            {isCreatingGuest ? "Setting up..." : "Try as Guest"}
          </Button>
          <Link to="/login">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-muted-foreground">
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="hero" size="sm">
              Start Free
            </Button>
          </Link>
        </div>
      </nav>
    </motion.header>
  );
};

export default Header;
