export type SessionType = 'lesson' | 'practice' | 'test';
export type StartLevel = 'beginner' | 'intermediate' | 'advanced';
export type Theme = 'dark' | 'light';
export type TypingDifficulty = 'easy' | 'medium' | 'hard';
export type ErrorStyle = 'underline' | 'highlight';
export type LayoutId = 'qwerty';
export type DailyGoal = 5 | 10 | 15 | 20;
export type TestDuration = 15 | 30 | 60 | 120;
export type FingerId = 'lp' | 'lr' | 'lm' | 'li' | 'lt' | 'rt' | 'ri' | 'rm' | 'rr' | 'rp';

export interface Settings {
  theme: Theme;
  dailyGoalMinutes: DailyGoal;
  sound: boolean;
  fingerGuidance: boolean;
  errorStyle: ErrorStyle;
  /** easy: cursor holds on a mistake; medium: mistakes advance, Backspace allowed; hard: no Backspace. */
  difficulty: TypingDifficulty;
  testDuration: TestDuration;
  reducedMotion: boolean;
  layout: LayoutId;
  unlockAllLessons: boolean;
}

export interface SessionRecord {
  id: string;
  type: SessionType;
  /** Lesson id, practice mode id, or test category id. */
  refId: string;
  label: string;
  startedAt: number;
  /** Local calendar date (YYYY-MM-DD) the session started on. */
  date: string;
  durationMs: number;
  /** Configured time limit in seconds for timed sessions. */
  targetSec: number | null;
  typed: number;
  correct: number;
  incorrect: number;
  uncorrected: number;
  grossWpm: number;
  netWpm: number;
  /** null when accuracy is not defined (free typing has no target text). */
  accuracy: number | null;
  keyErrors: Record<string, number>;
  keyTotals: Record<string, number>;
}

export interface LessonProgress {
  attempts: number;
  completed: boolean;
  bestAccuracy: number;
  bestWpm: number;
  completedAt: number | null;
}

export interface DailyActivity {
  sessions: number;
  durationMs: number;
  typed: number;
  /** Lesson attempts passed on this date. */
  lessons: number;
  bestWpm: number;
  bestAccuracy: number;
  xp: number;
  /** Sessions that already earned XP today, used for per-day XP caps. */
  rewarded: { practice: number; test: number };
}

/** Lifetime aggregates. They survive session-history trimming. */
export interface Stats {
  totalSessions: number;
  lessonSessions: number;
  practiceSessions: number;
  testSessions: number;
  totalDurationMs: number;
  /** Keystrokes and correct keystrokes across scored sessions only. */
  totalTyped: number;
  totalCorrect: number;
  wpmSum: number;
  wpmCount: number;
  bestWpm: number;
  bestTestWpm: number;
  bestAccuracy: number;
  perfectSessions: number;
  keyErrors: Record<string, number>;
  keyTotals: Record<string, number>;
}

export interface XpState {
  total: number;
  /** One-time rewards already granted, keyed by reward id. */
  awarded: Record<string, number>;
}

export interface StreakState {
  current: number;
  longest: number;
  lastDate: string | null;
}

export interface AppState {
  version: number;
  onboarded: boolean;
  startLevel: StartLevel;
  settings: Settings;
  lessons: Record<string, LessonProgress>;
  sessions: SessionRecord[];
  stats: Stats;
  xp: XpState;
  achievements: Record<string, number>;
  streak: StreakState;
  daily: Record<string, DailyActivity>;
  challenges: Record<string, number>;
}

export interface RewardItem {
  label: string;
  xp: number;
}

export interface RewardSummary {
  recorded: boolean;
  xp: number;
  items: RewardItem[];
  levelBefore: number;
  levelAfter: number;
  achievements: string[];
  challengeCompleted: boolean;
  personalBest: boolean;
  lessonCompleted: boolean;
  streak: number;
}

export interface Metrics {
  elapsedMs: number;
  typed: number;
  correct: number;
  incorrect: number;
  uncorrected: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
}
