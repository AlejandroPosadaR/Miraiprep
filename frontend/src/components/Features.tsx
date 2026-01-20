import { motion } from "framer-motion";
import { Brain, MessageSquare, Target, Zap, BarChart3, Shield } from "lucide-react";

const Features = () => {
  return (
    <section id="features" className="py-32 px-6 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-background" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-20"
        >
          <span className="text-sm font-medium text-primary mb-4 block">FEATURES</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Everything you need to <span className="text-gradient">succeed</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Our platform combines cutting-edge AI with proven interview techniques.
          </p>
        </motion.div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-4">
          {/* Large featured card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="col-span-12 md:col-span-7 bg-gradient-to-br from-primary to-accent rounded-3xl p-10 text-primary-foreground relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_50%)]" />
            <div className="relative z-10">
              <Brain className="w-12 h-12 mb-6" />
              <h3 className="text-3xl font-display font-bold mb-4">AI-Powered Analysis</h3>
              <p className="text-primary-foreground/80 text-lg max-w-md leading-relaxed">
                Our advanced AI analyzes your responses in real-time, providing detailed feedback on content, delivery, and confidence.
              </p>
            </div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          </motion.div>

          {/* Stacked cards */}
          <div className="col-span-12 md:col-span-5 grid gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-card rounded-3xl p-8 border border-border hover:shadow-xl transition-shadow duration-500"
            >
              <MessageSquare className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-xl font-display font-bold mb-2">Real-time Feedback</h3>
              <p className="text-muted-foreground">Instant analysis on tone, pace, and clarity.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-card rounded-3xl p-8 border border-border hover:shadow-xl transition-shadow duration-500"
            >
              <Target className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-xl font-display font-bold mb-2">Role-Specific</h3>
              <p className="text-muted-foreground">Tailored for your target position.</p>
            </motion.div>
          </div>

          {/* Bottom row - three equal cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="col-span-12 md:col-span-4 bg-card rounded-3xl p-8 border border-border hover:shadow-xl transition-shadow duration-500"
          >
            <Zap className="w-10 h-10 text-yellow-500 mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">Instant Results</h3>
            <p className="text-muted-foreground">Get your score and improvement tips immediately after each session.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="col-span-12 md:col-span-4 bg-card rounded-3xl p-8 border border-border hover:shadow-xl transition-shadow duration-500"
          >
            <BarChart3 className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">Track Progress</h3>
            <p className="text-muted-foreground">Monitor your growth with comprehensive analytics and insights.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="col-span-12 md:col-span-4 bg-card rounded-3xl p-8 border border-border hover:shadow-xl transition-shadow duration-500"
          >
            <Shield className="w-10 h-10 text-accent mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">100% Private</h3>
            <p className="text-muted-foreground">Your sessions are encrypted and never shared with anyone.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Features;
