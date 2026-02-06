import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Target, Layers, Brain, ArrowUpRight } from "lucide-react";

const categories = [
  { icon: Target, title: "OOP", description: "Object-oriented programming concepts and principles", count: "200+" },
  { icon: Layers, title: "Backend", description: "Spring Boot, APIs, databases, and backend architecture", count: "300+" },
  { icon: Brain, title: "Fullstack", description: "End-to-end system design and implementation", count: "250+" },
];

const InterviewCategories = () => {
  return (
    <section id="categories" className="py-32 px-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Left text - spans 2 columns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2 lg:sticky lg:top-32"
          >
            <span className="text-sm font-medium text-primary mb-4 block">CATEGORIES</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Pick your <span className="text-gradient">interview type</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Practice with technical interviews covering OOP, backend development, and fullstack engineering.
            </p>
            <Button variant="hero" className="shadow-lg shadow-primary/20">
              View All Categories
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>

          {/* Right - Category cards - spans 3 columns */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="h-full bg-card rounded-3xl border border-border p-6 hover:shadow-xl hover:border-primary/20 transition-all duration-500 flex flex-col">
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <category.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-display font-bold mb-2">{category.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                    <p className="text-xs text-muted-foreground">{category.count} questions</p>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Start practice</span>
                      <ArrowUpRight className="w-4 h-4 text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InterviewCategories;
