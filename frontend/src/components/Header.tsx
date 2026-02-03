import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

const Header = () => {
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
