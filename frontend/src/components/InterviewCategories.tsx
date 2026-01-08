import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Code, Users, Briefcase, TrendingUp, Palette, Megaphone, ArrowUpRight } from "lucide-react";

const categories = [
  { icon: Code, title: "Technical", count: "500+" },
  { icon: Users, title: "Behavioral", count: "300+" },
  { icon: Briefcase, title: "Case Study", count: "200+" },
  { icon: TrendingUp, title: "Product", count: "250+" },
  { icon: Palette, title: "Design", count: "150+" },
  { icon: Megaphone, title: "Sales", count: "180+" },
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
              Pick your <span className="text-gradient">path</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Choose from specialized interview categories tailored to your target role and industry.
            </p>
            <Button variant="hero" className="shadow-lg shadow-primary/20">
              View All Categories
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>

          {/* Right - Masonry-style cards - spans 3 columns */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-4">
            {categories.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className={`group cursor-pointer ${index % 3 === 0 ? 'row-span-2' : ''}`}
              >
                <div className={`h-full bg-card rounded-3xl border border-border p-6 hover:shadow-xl hover:border-primary/20 transition-all duration-500 flex flex-col ${index % 3 === 0 ? 'justify-between' : ''}`}>
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <category.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-display font-bold mb-2">{category.title}</h3>
                    <p className="text-sm text-muted-foreground">{category.count} questions</p>
                  </div>
                  
                  {index % 3 === 0 && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Start practice</span>
                        <ArrowUpRight className="w-4 h-4 text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </div>
                    </div>
                  )}
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
