import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Choose your role",
    description: "Select from 50+ job categories and customize difficulty level.",
  },
  {
    number: "02", 
    title: "Practice interview",
    description: "Engage in realistic AI-powered mock interviews with voice or text.",
  },
  {
    number: "03",
    title: "Get feedback",
    description: "Receive detailed analysis with actionable improvement tips.",
  },
  {
    number: "04",
    title: "Track & improve",
    description: "Monitor your progress and watch your confidence grow.",
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
                Four steps to your <span className="text-gradient">dream job</span>
              </h2>
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
