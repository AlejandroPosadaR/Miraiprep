import { Target, Layers, Sparkles, MessageSquare, User, Brain } from "lucide-react";

export const INTERVIEW_TYPES = [
  {
    title: "OOP Concepts",
    interviewType: "OOP",
    description: "Object-oriented programming principles",
    icon: Target,
    color: "from-violet-500 to-purple-600",
  },
  {
    title: "Spring Boot",
    interviewType: "SPRING_BOOT",
    description: "Java backend with Spring Boot (APIs, JPA, security)",
    icon: Layers,
    color: "from-green-500 to-emerald-600",
  },
  {
    title: "System Design",
    interviewType: "SYSTEM_DESIGN",
    description: "Architecture and design patterns",
    icon: Sparkles,
    color: "from-blue-500 to-cyan-600",
  },
  {
    title: "JavaScript / React",
    interviewType: "JAVASCRIPT_REACT",
    description: "Frontend fundamentals, hooks, performance, TypeScript",
    icon: MessageSquare,
    color: "from-amber-500 to-orange-600",
  },
  {
    title: "Behavioral",
    interviewType: "BEHAVIORAL",
    description: "Soft skills and situational questions",
    icon: User,
    color: "from-emerald-500 to-teal-600",
  },
  {
    title: "Fullstack",
    interviewType: "FULLSTACK",
    description: "End-to-end system thinking (FE + BE + delivery)",
    icon: Brain,
    color: "from-fuchsia-500 to-pink-600",
  },
] as const;

export type InterviewType = typeof INTERVIEW_TYPES[number];
