import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Software Engineer at Google",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    content: "MiraiPrep helped me land my dream job! The AI feedback was incredibly detailed and helped me identify weak spots I didn't even know I had.",
    rating: 5,
  },
  {
    name: "Marcus Johnson",
    role: "Product Manager at Meta",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    content: "The behavioral interview practice was a game-changer. I went from nervous rambling to confident, structured responses in just two weeks.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "Data Scientist at Netflix",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    content: "I practiced technical interviews daily for a month. The real-time feedback loop is exactly what I needed to sharpen my problem-solving skills.",
    rating: 5,
  },
  {
    name: "David Park",
    role: "Frontend Developer at Stripe",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    content: "Worth every penny. The mock interviews felt so realistic that my actual interviews seemed easier in comparison!",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary font-medium text-sm tracking-wider uppercase">
            Success Stories
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mt-3 mb-4">
            Loved by 10,000+ job seekers
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Join thousands who've transformed their interview skills and landed their dream roles.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative"
            >
              <div className="bg-background rounded-2xl p-8 shadow-sm border border-border/50 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                {/* Quote icon */}
                <Quote className="w-10 h-10 text-primary/20 mb-4" />

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-foreground/80 text-lg leading-relaxed mb-6">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/10"
                  />
                  <div>
                    <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
