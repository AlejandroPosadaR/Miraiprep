export const EXPERIENCE_LEVELS = [
  { years: 1, label: "Junior (0-2 years)", desc: "Fundamentals" },
  { years: 3, label: "Mid (2-4 years)", desc: "Practical" },
  { years: 6, label: "Senior (5-8 years)", desc: "Architecture" },
  { years: 10, label: "Staff (8+ years)", desc: "Strategic" },
] as const;

export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];

export function getExperienceLevelLabel(years: number | null | undefined): string {
  if (years == null) return "Mid";
  if (years <= 2) return "Junior";
  if (years <= 4) return "Mid";
  if (years <= 8) return "Senior";
  return "Staff";
}
