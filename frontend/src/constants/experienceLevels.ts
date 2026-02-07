export const EXPERIENCE_LEVELS = [
  { 
    years: 1, 
    label: "Junior / Entry", 
    range: "0–2 years",
    desc: "Fundamentals"
  },
  { 
    years: 3, 
    label: "Mid-level", 
    range: "2–5 years",
    desc: "Practical"
  },
  { 
    years: 6, 
    label: "Senior", 
    range: "5–8 years",
    desc: "Architecture"
  },
  { 
    years: 10, 
    label: "Staff", 
    range: "8–12+ years",
    desc: "Strategic"
  },
] as const;

export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];

export function getExperienceLevelLabel(years: number | null | undefined): string {
  if (years == null) return "Mid-level";
  if (years <= 1) return "Junior / Entry";
  if (years <= 3) return "Mid-level";
  if (years <= 6) return "Senior";
  return "Staff";
}
