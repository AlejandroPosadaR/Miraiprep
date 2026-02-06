import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Start your session",
    description: "Choose interview type (Technical, Behavioral, System Design, etc.) and set your experience level. Our AI adapts questions to match your skill level.",
  },
  {
    number: "02", 
    title: "Real-time conversation",
    description: "Chat via WebSocket with GPT-4o-mini. Your messages are queued via AWS SQS, processed asynchronously by our AI worker, and streamed back token-by-token for instant responses.",
  },
  {
    number: "03",
    title: "Voice interaction",
    description: "Use OpenAI Whisper for speech-to-text and OpenAI TTS for text-to-speech. Experience natural voice conversations with the AI interviewer.",
  },
  {
    number: "04",
    title: "AI-powered evaluation",
    description: "Get comprehensive feedback with scores across knowledge, communication, problem-solving, and technical depth. All data stored securely in PostgreSQL on AWS RDS.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left - Visual */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="aspect-square relative">
              {/* Decorative circles */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full border-2 border-dashed border-border" />
              </div>
              <div className="absolute inset-8 flex items-center justify-center">
                <div className="w-full h-full rounded-full border-2 border-dashed border-primary/20" />
              </div>
              <div className="absolute inset-16 flex items-center justify-center">
                <div className="w-full h-full rounded-full border-2 border-dashed border-accent/20" />
              </div>
              
              {/* Center content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30">
                  <span className="text-5xl font-display font-bold text-primary-foreground">AI</span>
                </div>
              </div>

              {/* Floating elements */}
              {steps.map((step, i) => {
                const angle = (i * 90 - 45) * (Math.PI / 180);
                const radius = 45;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                    className="absolute w-14 h-14 bg-card rounded-2xl border border-border shadow-lg flex items-center justify-center"
                    style={{
                      left: `${50 + radius * Math.cos(angle)}%`,
                      top: `${50 + radius * Math.sin(angle)}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <span className="text-lg font-bold text-gradient">{step.number}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Right - Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-12"
            >
              <span className="text-sm font-medium text-primary mb-4 block">HOW IT WORKS</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
                Powered by <span className="text-gradient">real-time AI</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Built with WebSocket streaming, AWS SQS queuing, and OpenAI GPT-4o-mini for instant, realistic interview experiences.
              </p>
            </motion.div>

            <div className="space-y-8">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="flex gap-6 group"
                >
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                    <span className="text-xl font-bold text-gradient">{step.number}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
