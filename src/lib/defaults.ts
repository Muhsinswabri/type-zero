import type { AppState, DailyActivity, Settings, Stats } from '../types';

export const SCHEMA_VERSION = 1;

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function defaultSettings(): Settings {
  return {
    theme: 'dark',
    dailyGoalMinutes: 10,
    sound: false,
    fingerGuidance: true,
    errorStyle: 'underline',
    difficulty: 'medium',
    testDuration: 60,
    reducedMotion: prefersReducedMotion(),
    layout: 'qwerty',
    unlockAllLessons: false,
  };
}

export function emptyStats(): Stats {
  return {
    totalSessions: 0,
    lessonSessions: 0,
    practiceSessions: 0,
    testSessions: 0,
    totalDurationMs: 0,
    totalTyped: 0,
    totalCorrect: 0,
    wpmSum: 0,
    wpmCount: 0,
    bestWpm: 0,
    bestTestWpm: 0,
    bestAccuracy: 0,
    perfectSessions: 0,
    keyErrors: {},
    keyTotals: {},
  };
}

export function emptyDaily(): DailyActivity {
  return {
    sessions: 0,
    durationMs: 0,
    typed: 0,
    lessons: 0,
    bestWpm: 0,
    bestAccuracy: 0,
    xp: 0,
    rewarded: { practice: 0, test: 0 },
  };
}

export function createDefaultState(): AppState {
  return {
    version: SCHEMA_VERSION,
    onboarded: false,
    startLevel: 'beginner',
    settings: defaultSettings(),
    lessons: {},
    sessions: [],
    stats: emptyStats(),
    xp: { total: 0, awarded: {} },
    achievements: {},
    streak: { current: 0, longest: 0, lastDate: null },
    daily: {},
    challenges: {},
  };
}
