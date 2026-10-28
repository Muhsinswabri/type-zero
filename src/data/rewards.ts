/** Central reward and limit configuration. Tune XP and anti-farming rules here. */
export const REWARDS = {
  /** Minimum keystrokes for a session to count toward accuracy, speed and XP. */
  minQualifyChars: 20,
  /** Minimum duration (ms) for a session's speed to count toward best/average WPM and speed achievements. */
  minSpeedMs: 10_000,
  /** Minimum duration (ms) for a practice or test session to earn XP. */
  minRewardMs: 15_000,

  practice: { xp: 10, dailyCap: 5 },
  /** XP per speed-test duration in seconds. Fallback is `testDefault`. */
  test: { byDuration: { 15: 5, 30: 10, 60: 20, 120: 30 } as Record<number, number>, fallback: 10, dailyCap: 5 },
  dailyChallenge: 25,
  personalBest: 15,
  accuracyMilestones: [
    { accuracy: 95, xp: 20 },
    { accuracy: 100, xp: 40 },
  ],
} as const;

export const DEFAULT_MIN_ACCURACY = 90;
export const MAX_SESSIONS = 500;
export const MAX_DAILY_ENTRIES = 730;

/** Cumulative XP needed to reach level L is XP_PER_LEVEL_STEP * (L - 1) * L. */
export const XP_PER_LEVEL_STEP = 50;

export const LEVEL_TITLES: { from: number; title: string }[] = [
  { from: 1, title: 'Newcomer' },
  { from: 3, title: 'Apprentice' },
  { from: 6, title: 'Typist' },
  { from: 10, title: 'Keyboard Adept' },
  { from: 15, title: 'Speedster' },
  { from: 22, title: 'Touch-Typing Pro' },
  { from: 30, title: 'Master of Keys' },
];
