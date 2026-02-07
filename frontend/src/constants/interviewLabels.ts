export function getInterviewTypeLabel(type?: string | null): string {
  if (!type) return "Technical";
  if (type === "OOP") return "OOP Concepts";
  if (type === "SPRING_BOOT") return "Spring Boot";
  if (type === "SYSTEM_DESIGN") return "System Design";
  if (type === "JAVASCRIPT_REACT") return "JavaScript / React";
  if (type === "BEHAVIORAL") return "Behavioral";
  if (type === "FULLSTACK") return "Fullstack";
  return type;
}
