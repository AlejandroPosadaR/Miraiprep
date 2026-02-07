// Available OpenAI TTS voices - professional interviewer voices
// Voice characteristics based on OpenAI TTS documentation:
export const TTS_VOICES = [
  { 
    id: "alloy", 
    name: "Alloy", 
    desc: "Neutral, versatile",
    gender: "Androgynous",
    tone: "Balanced, clear",
    bestFor: "General purpose, technical interviews"
  },
  { 
    id: "echo", 
    name: "Echo", 
    desc: "Warm, conversational",
    gender: "Male",
    tone: "Friendly, approachable",
    bestFor: "Casual interviews, coaching sessions"
  },
  { 
    id: "fable", 
    name: "Fable", 
    desc: "Expressive, British",
    gender: "Male",
    tone: "Sophisticated, articulate",
    bestFor: "Formal interviews, storytelling"
  },
  { 
    id: "onyx", 
    name: "Onyx", 
    desc: "Deep, authoritative",
    gender: "Male",
    tone: "Confident, commanding",
    bestFor: "Executive interviews, leadership roles"
  },
  { 
    id: "nova", 
    name: "Nova", 
    desc: "Friendly, energetic",
    gender: "Female",
    tone: "Upbeat, enthusiastic",
    bestFor: "Creative roles, team interviews"
  },
  { 
    id: "shimmer", 
    name: "Shimmer", 
    desc: "Clear, professional",
    gender: "Female",
    tone: "Polished, articulate",
    bestFor: "Professional interviews, presentations"
  },
] as const;

export type TtsVoice = typeof TTS_VOICES[number];
export type TtsVoiceId = TtsVoice["id"];
