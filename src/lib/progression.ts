import { ACHIEVEMENTS, isAchieved } from '../data/achievements';
import { challengeForDate, challengeProgress } from '../data/challenges';
import { ALL_LESSONS, LESSON_BY_ID, START_LESSON, type Lesson, type Module } from '../data/curriculum';
import { MAX_DAILY_ENTRIES, MAX_SESSIONS, REWARDS } from '../data/rewards';
import { emptyDaily } from './defaults';
import { daysBetween } from './dates';
import { levelFromXp } from './levels';
import { buildMetrics, countsForSpeed, mergeCounts } from './typingMetrics';
import type {
  AppState,
  LessonProgress,
  Metrics,
  RewardItem,
  RewardSummary,
  SessionRecord,
  Stats,
  StreakState,
} from '../types';

/* ------------------------------------------------------------------ lessons */

export type LessonStatus = 'completed' | 'current' | 'available' | 'locked';

export function startIndex(state: AppState): number {
  const idx = ALL_LESSONS.findIndex((l) => l.id === START_LESSON[state.startLevel]);
  return Math.max(0, idx);
}

export function isCompleted(state: AppState, lessonId: string): boolean {
  return state.lessons[lessonId]?.completed === true;
}

/**
 * A lesson is open when the previous lesson is completed, it is at or before the chosen starting
 * point, it was already completed, or the learner turned on "unlock all lessons" in settings.
 */
export function isLessonUnlocked(state: AppState, lessonId: string): boolean {
  const idx = ALL_LESSONS.findIndex((l) => l.id === lessonId);
  if (idx < 0) return false;
  if (state.settings.unlockAllLessons) return true;
  if (isCompleted(state, lessonId)) return true;
  if (idx <= startIndex(state)) return true;
  return isCompleted(state, ALL_LESSONS[idx - 1].id);
}

/** First incomplete lesson at or after the starting point, or null when everything is done. */
export function recommendedLesson(state: AppState): Lesson | null {
  for (let i = startIndex(state); i < ALL_LESSONS.length; i++) {
    if (!isCompleted(state, ALL_LESSONS[i].id)) return ALL_LESSONS[i];
  }
  return null;
}

export function lessonStatus(state: AppState, lessonId: string): LessonStatus {
  if (isCompleted(state, lessonId)) return 'completed';
  if (!isLessonUnlocked(state, lessonId)) return 'locked';
  return recommendedLesson(state)?.id === lessonId ? 'current' : 'available';
}

export function nextLesson(lessonId: string): Lesson | null {
  const idx = ALL_LESSONS.findIndex((l) => l.id === lessonId);
  return idx >= 0 && idx < ALL_LESSONS.length - 1 ? ALL_LESSONS[idx + 1] : null;
}

export function moduleProgress(state: AppState, module: Module): { done: number; total: number; percent: number } {
  const total = module.lessons.length;
  const done = module.lessons.filter((l) => isCompleted(state, l.id)).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function curriculumProgress(state: AppState): { done: number; total: number; percent: number } {
  const total = ALL_LESSONS.length;
  const done = ALL_LESSONS.filter((l) => isCompleted(state, l.id)).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Minutes left on lessons at or after the learner's starting point. */
export function remainingMinutes(state: AppState): number {
  const from = startIndex(state);
  return ALL_LESSONS.reduce((sum, l, i) => (i >= from && !isCompleted(state, l.id) ? sum + l.durationMin : sum), 0);
}

export const completedLessonCount = (state: AppState) => curriculumProgress(state).done;

/* ------------------------------------------------------------ lesson attempts */

export interface ExerciseResult {
  typed: number;
  correct: number;
  uncorrected: number;
  elapsedMs: number;
  /** The whole exercise text was typed before any time limit ran out. */
  completed: boolean;
  keyErrors: Record<string, number>;
  keyTotals: Record<string, number>;
}

export interface AttemptSummary {
  metrics: Metrics;
  keyErrors: Record<string, number>;
  keyTotals: Record<string, number>;
}

export function aggregateAttempt(results: ExerciseResult[]): AttemptSummary {
  let typed = 0;
  let correct = 0;
  let uncorrected = 0;
  let elapsed = 0;
  let keyErrors: Record<string, number> = {};
  let keyTotals: Record<string, number> = {};
  for (const r of results) {
    typed += r.typed;
    correct += r.correct;
    uncorrected += r.uncorrected;
    elapsed += r.elapsedMs;
    keyErrors = mergeCounts(keyErrors, r.keyErrors);
    keyTotals = mergeCounts(keyTotals, r.keyTotals);
  }
  return { metrics: buildMetrics(typed, correct, uncorrected, elapsed), keyErrors, keyTotals };
}

export type AttemptFailure = 'exercises' | 'incomplete' | 'accuracy' | 'speed';

export interface AttemptEvaluation {
  passed: boolean;
  metrics: Metrics;
  reasons: AttemptFailure[];
}

/**
 * Completion criteria: every exercise attempted and finished (including the last one), combined
 * accuracy at or above the lesson minimum, and combined net WPM above the lesson's speed goal if set.
 */
export function evaluateAttempt(lesson: Lesson, results: ExerciseResult[]): AttemptEvaluation {
  const { metrics } = aggregateAttempt(results);
  const reasons: AttemptFailure[] = [];
  if (results.length < lesson.exercises.length) reasons.push('exercises');
  if (results.length === 0 || results.some((r) => !r.completed)) reasons.push('incomplete');
  if (metrics.accuracy < lesson.minAccuracy) reasons.push('accuracy');
  if (lesson.minWpm !== undefined && metrics.netWpm < lesson.minWpm) reasons.push('speed');
  return { passed: reasons.length === 0, metrics, reasons };
}

/* -------------------------------------------------------------------- streak */

/** Counts a practice day. Several sessions on one date never add more than one day. */
export function advanceStreak(streak: StreakState, today: string): StreakState {
  if (streak.lastDate === today) return streak;
  let current = 1;
  if (streak.lastDate) {
    const gap = daysBetween(streak.lastDate, today);
    if (Number.isNaN(gap) || gap < 0) return streak; // clock moved backwards: leave the streak alone
    current = gap === 1 ? streak.current + 1 : 1;
  }
  return { current, longest: Math.max(streak.longest, current), lastDate: today };
}

/** Streak to show today: it is still alive if the last practice day was today or yesterday. */
export function currentStreak(streak: StreakState, today: string): number {
  if (!streak.lastDate) return 0;
  const gap = daysBetween(streak.lastDate, today);
  return gap === 0 || gap === 1 ? streak.current : 0;
}

/* ------------------------------------------------------------------ activity */

export interface ActivityInput {
  session: SessionRecord;
  lesson?: { id: string; passed: boolean; xp: number };
}

function noReward(state: AppState): RewardSummary {
  const level = levelFromXp(state.xp.total);
  return {
    recorded: false,
    xp: 0,
    items: [],
    levelBefore: level,
    levelAfter: level,
    achievements: [],
    challengeCompleted: false,
    personalBest: false,
    lessonCompleted: false,
    streak: state.streak.current,
  };
}

/**
 * Applies one finished session to the saved state: history, aggregates, daily activity, streak,
 * lesson progress, XP, daily challenge and achievements. Pure: returns a new state.
 * A session id that was already recorded is ignored, so repeated calls never double-award XP.
 */
export function applyActivity(
  state: AppState,
  input: ActivityInput,
  now: number = Date.now(),
): { state: AppState; reward: RewardSummary } {
  const s = input.session;
  if (state.sessions.some((x) => x.id === s.id)) return { state, reward: noReward(state) };

  const levelBefore = levelFromXp(state.xp.total);
  const qualifies = s.typed >= REWARDS.minQualifyChars;
  const speedCounts = countsForSpeed(s);
  const scored = s.accuracy !== null;
  const qualifiesScored = qualifies && scored;
  const prevBestTest = state.stats.bestTestWpm;

  const stats: Stats = {
    ...state.stats,
    totalSessions: state.stats.totalSessions + 1,
    lessonSessions: state.stats.lessonSessions + (s.type === 'lesson' ? 1 : 0),
    practiceSessions: state.stats.practiceSessions + (s.type === 'practice' ? 1 : 0),
    testSessions: state.stats.testSessions + (s.type === 'test' ? 1 : 0),
    totalDurationMs: state.stats.totalDurationMs + s.durationMs,
    totalTyped: state.stats.totalTyped + (scored ? s.typed : 0),
    totalCorrect: state.stats.totalCorrect + (scored ? s.correct : 0),
    wpmSum: state.stats.wpmSum + (speedCounts ? s.netWpm : 0),
    wpmCount: state.stats.wpmCount + (speedCounts ? 1 : 0),
    bestWpm: speedCounts ? Math.max(state.stats.bestWpm, s.netWpm) : state.stats.bestWpm,
    bestTestWpm: s.type === 'test' && speedCounts ? Math.max(prevBestTest, s.netWpm) : prevBestTest,
    bestAccuracy: qualifiesScored ? Math.max(state.stats.bestAccuracy, s.accuracy as number) : state.stats.bestAccuracy,
    perfectSessions: state.stats.perfectSessions + (qualifiesScored && s.accuracy === 100 ? 1 : 0),
    keyErrors: mergeCounts(state.stats.keyErrors, s.keyErrors),
    keyTotals: mergeCounts(state.stats.keyTotals, s.keyTotals),
  };

  const prevDaily = state.daily[s.date] ?? emptyDaily();
  const daily = {
    ...prevDaily,
    sessions: prevDaily.sessions + 1,
    durationMs: prevDaily.durationMs + s.durationMs,
    typed: prevDaily.typed + s.typed,
    lessons: prevDaily.lessons + (input.lesson?.passed ? 1 : 0),
    bestWpm: speedCounts ? Math.max(prevDaily.bestWpm, s.netWpm) : prevDaily.bestWpm,
    bestAccuracy: qualifiesScored ? Math.max(prevDaily.bestAccuracy, s.accuracy as number) : prevDaily.bestAccuracy,
    rewarded: { ...prevDaily.rewarded },
  };

  let lessons = state.lessons;
  let lessonCompleted = false;
  if (input.lesson) {
    const prev: LessonProgress = state.lessons[input.lesson.id] ?? {
      attempts: 0,
      completed: false,
      bestAccuracy: 0,
      bestWpm: 0,
      completedAt: null,
    };
    lessonCompleted = input.lesson.passed && !prev.completed;
    lessons = {
      ...state.lessons,
      [input.lesson.id]: {
        attempts: prev.attempts + 1,
        completed: prev.completed || input.lesson.passed,
        bestAccuracy: Math.max(prev.bestAccuracy, s.accuracy ?? 0),
        bestWpm: Math.max(prev.bestWpm, s.netWpm),
        completedAt: prev.completedAt ?? (input.lesson.passed ? now : null),
      },
    };
  }

  const awarded = { ...state.xp.awarded };
  let totalXp = state.xp.total;
  const items: RewardItem[] = [];
  const grant = (label: string, amount: number, key?: string): boolean => {
    if (amount <= 0) return false;
    if (key !== undefined) {
      if (awarded[key] !== undefined) return false;
      awarded[key] = amount;
    }
    totalXp += amount;
    daily.xp += amount;
    items.push({ label, xp: amount });
    return true;
  };

  if (input.lesson && lessonCompleted) grant('Lesson complete', input.lesson.xp, `lesson:${input.lesson.id}`);

  const longEnough = s.durationMs >= REWARDS.minRewardMs;
  if (s.type === 'practice' && qualifies && longEnough && daily.rewarded.practice < REWARDS.practice.dailyCap) {
    if (grant('Practice session', REWARDS.practice.xp)) daily.rewarded.practice += 1;
  }
  if (s.type === 'test' && qualifies && longEnough && daily.rewarded.test < REWARDS.test.dailyCap) {
    const xp = REWARDS.test.byDuration[s.targetSec ?? 0] ?? REWARDS.test.fallback;
    if (grant('Speed test', xp)) daily.rewarded.test += 1;
  }

  if (qualifiesScored) {
    for (const m of REWARDS.accuracyMilestones) {
      if ((s.accuracy as number) >= m.accuracy) grant(`${m.accuracy}% accuracy milestone`, m.xp, `milestone:acc${m.accuracy}`);
    }
  }

  let personalBest = false;
  if (s.type === 'test' && speedCounts && prevBestTest > 0 && s.netWpm >= prevBestTest + 1) {
    personalBest = grant('New personal best', REWARDS.personalBest);
  }

  let challenges = state.challenges;
  let challengeCompleted = false;
  const challenge = challengeForDate(s.date);
  if (state.challenges[s.date] === undefined && challengeProgress(challenge, daily).done) {
    challenges = { ...state.challenges, [s.date]: now };
    challengeCompleted = grant(`Daily challenge: ${challenge.title}`, REWARDS.dailyChallenge, `challenge:${s.date}`);
  }

  const dailyMap = { ...state.daily, [s.date]: daily };
  const dailyKeys = Object.keys(dailyMap).sort();
  if (dailyKeys.length > MAX_DAILY_ENTRIES) {
    for (const k of dailyKeys.slice(0, dailyKeys.length - MAX_DAILY_ENTRIES)) delete dailyMap[k];
  }

  const unlocked = { ...state.achievements };
  const snapshot = (): AppState => ({
    ...state,
    sessions: [...state.sessions, s].slice(-MAX_SESSIONS),
    stats,
    daily: dailyMap,
    streak: advanceStreak(state.streak, s.date),
    lessons,
    challenges,
    achievements: unlocked,
    xp: { total: totalXp, awarded },
  });

  const newAchievements: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked[a.id] !== undefined) continue;
    if (isAchieved(a, snapshot())) {
      unlocked[a.id] = now;
      newAchievements.push(a.id);
      grant(`Achievement: ${a.name}`, a.xp, `ach:${a.id}`);
    }
  }

  const next = snapshot();
  return {
    state: next,
    reward: {
      recorded: true,
      xp: items.reduce((n, i) => n + i.xp, 0),
      items,
      levelBefore,
      levelAfter: levelFromXp(next.xp.total),
      achievements: newAchievements,
      challengeCompleted,
      personalBest,
      lessonCompleted,
      streak: next.streak.current,
    },
  };
}

export function lessonById(id: string | undefined): Lesson | null {
  return id ? (LESSON_BY_ID[id] ?? null) : null;
}
