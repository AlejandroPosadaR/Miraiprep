/**
 * Application-wide constants for MiraiPrep
 */

// API Configuration
export const API_TIMEOUT_MS = 30000;
export const WEBSOCKET_RECONNECT_DELAY_MS = 3000;

// Interview Configuration
export const MAX_MESSAGE_LENGTH = 10000;
export const MESSAGES_PER_PAGE = 200;
export const SESSIONS_PER_PAGE = 10;

// Speech Configuration
export const TTS_DEFAULT_VOICE = 'alloy';
export const TTS_DEFAULT_SPEED = 1.0;
export const TTS_MIN_SPEED = 0.5;
export const TTS_MAX_SPEED = 1.5;
export const STT_LANGUAGE = 'en-US';
export const STT_SILENCE_TIMEOUT_MS = 2000;

// UI Configuration
export const DELTA_FLUSH_INTERVAL_MS = 50;
export const ELAPSED_TIME_UPDATE_INTERVAL_MS = 1000;

// Experience Levels
export const EXPERIENCE_LEVELS = {
  ENTRY: { min: 0, max: 1, label: 'Entry Level' },
  MID: { min: 2, max: 3, label: 'Mid Level' },
  SENIOR: { min: 4, max: 6, label: 'Senior' },
  STAFF: { min: 7, max: Infinity, label: 'Staff+' },
} as const;

// Interview Types
export const INTERVIEW_TYPES = [
  { id: 'OOP', label: 'OOP Concepts', description: 'Object-oriented programming principles' },
  { id: 'SYSTEM_DESIGN', label: 'System Design', description: 'Architecture and scalability' },
  { id: 'BEHAVIORAL', label: 'Behavioral', description: 'Soft skills and situational questions' },
  { id: 'SPRING_BOOT', label: 'Spring Boot', description: 'Java Spring framework' },
  { id: 'JAVASCRIPT_REACT', label: 'JavaScript / React', description: 'Frontend development' },
  { id: 'FULLSTACK', label: 'Fullstack', description: 'End-to-end development' },
] as const;

// TTS Voices
export const TTS_VOICES = [
  { id: 'alloy', name: 'Alloy', gender: 'Androgynous', tone: 'Balanced, clear' },
  { id: 'echo', name: 'Echo', gender: 'Male', tone: 'Friendly, approachable' },
  { id: 'fable', name: 'Fable', gender: 'Male', tone: 'Sophisticated, articulate' },
  { id: 'onyx', name: 'Onyx', gender: 'Male', tone: 'Confident, commanding' },
  { id: 'nova', name: 'Nova', gender: 'Female', tone: 'Upbeat, enthusiastic' },
  { id: 'shimmer', name: 'Shimmer', gender: 'Female', tone: 'Polished, articulate' },
] as const;

export type TTSVoiceId = typeof TTS_VOICES[number]['id'];
export type InterviewTypeId = typeof INTERVIEW_TYPES[number]['id'];
