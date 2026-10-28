import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../data/achievements';
import { challengeForDate, challengeProgress } from '../data/challenges';
import { ALL_LESSONS, LESSON_BY_ID } from '../data/curriculum';
import { REWARDS } from '../data/rewards';
import { addDays, daysBetween, toDateKey } from '../lib/dates';
import { levelFromXp, levelInfo, xpForLevel } from '../lib/levels';
import {
  advanceStreak,
  applyActivity,
  currentStreak,
  evaluateAttempt,
  isLessonUnlocked,
  lessonStatus,
  recommendedLesson,
  type ExerciseResult,
} from '../lib/progression';
import { makeSession, makeState } from './helpers';

const lesson = LESSON_BY_ID['m2-left'];

function result(over: Partial<ExerciseResult> = {}): ExerciseResult {
  return { typed: 30, correct: 30, uncorrected: 0, elapsedMs: 30_000, completed: true, keyErrors: {}, keyTotals: {}, ...over };
}

describe('lesson completion criteria', () => {
  const all = (r: ExerciseResult) => lesson.exercises.map(() => r);

  it('passes when every exercise is finished at the minimum accuracy', () => {
    const e = evaluateAttempt(lesson, all(result({ typed: 100, correct: 90 })));
    expect(e.passed).toBe(true);
    expect(e.metrics.accuracy).toBe(90);
  });

  it('fails below the minimum accuracy', () => {
    const e = evaluateAttempt(lesson, all(result({ typed: 100, correct: 89 })));
    expect(e.passed).toBe(false);
    expect(e.reasons).toContain('accuracy');
  });

  it('fails when not all exercises were attempted', () => {
    const e = evaluateAttempt(lesson, [result()]);
    expect(e.passed).toBe(false);
    expect(e.reasons).toContain('exercises');
  });

  it('fails when an exercise was not finished', () => {
    const rs = all(result());
    rs[rs.length - 1] = result({ completed: false });
    const e = evaluateAttempt(lesson, rs);
    expect(e.passed).toBe(false);
    expect(e.reasons).toContain('incomplete');
  });

  it('enforces a minimum speed when a lesson sets one', () => {
    const fast = LESSON_BY_ID['m8-goals'];
    const slow = fast.exercises.map(() => result({ typed: 50, correct: 50, elapsedMs: 120_000 }));
    expect(evaluateAttempt(fast, slow).reasons).toContain('speed');
    const quick = fast.exercises.map(() => result({ typed: 200, correct: 200, elapsedMs: 30_000 }));
    expect(evaluateAttempt(fast, quick).passed).toBe(true);
  });
});

describe('lesson prerequisites', () => {
  it('opens only the first lesson for a new beginner', () => {
    const s = makeState();
    expect(isLessonUnlocked(s, ALL_LESSONS[0].id)).toBe(true);
    expect(isLessonUnlocked(s, ALL_LESSONS[1].id)).toBe(false);
    expect(lessonStatus(s, ALL_LESSONS[0].id)).toBe('current');
    expect(lessonStatus(s, ALL_LESSONS[1].id)).toBe('locked');
    expect(recommendedLesson(s)?.id).toBe(ALL_LESSONS[0].id);
  });

  it('unlocks the next lesson when the previous one is completed', () => {
    const s = makeState({
      lessons: { [ALL_LESSONS[0].id]: { attempts: 1, completed: true, bestAccuracy: 95, bestWpm: 10, completedAt: 1 } },
    });
    expect(isLessonUnlocked(s, ALL_LESSONS[1].id)).toBe(true);
    expect(isLessonUnlocked(s, ALL_LESSONS[2].id)).toBe(false);
    expect(recommendedLesson(s)?.id).toBe(ALL_LESSONS[1].id);
  });

  it('opens everything up to the chosen starting level without marking it complete', () => {
    const s = makeState({ startLevel: 'intermediate' });
    expect(isLessonUnlocked(s, 'm5-all')).toBe(true);
    expect(isLessonUnlocked(s, 'm1-keyboard')).toBe(true);
    expect(isLessonUnlocked(s, 'm5-words')).toBe(false);
    expect(recommendedLesson(s)?.id).toBe('m5-all');
    expect(lessonStatus(s, 'm1-keyboard')).not.toBe('completed');
  });

  it('can unlock all lessons from settings', () => {
    const s = makeState();
    s.settings = { ...s.settings, unlockAllLessons: true };
    expect(isLessonUnlocked(s, ALL_LESSONS[ALL_LESSONS.length - 1].id)).toBe(true);
  });
});

describe('levels', () => {
  it('uses the documented cumulative formula 50 * (L - 1) * L', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(xpForLevel(4)).toBe(600);
  });
  it('maps XP to levels at the boundaries', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(299)).toBe(2);
    expect(levelFromXp(300)).toBe(3);
  });
  it('round-trips for many levels', () => {
    for (let l = 1; l <= 60; l++) {
      expect(levelFromXp(xpForLevel(l))).toBe(l);
      expect(levelFromXp(xpForLevel(l + 1) - 1)).toBe(l);
    }
  });
  it('reports progress through the current level', () => {
    const i = levelInfo(200);
    expect(i.level).toBe(2);
    expect(i.xpIntoLevel).toBe(100);
    expect(i.xpToNext).toBe(100);
    expect(i.progress).toBeCloseTo(0.5);
  });
});

describe('daily streak (local calendar dates)', () => {
  const fresh = { current: 0, longest: 0, lastDate: null };

  it('starts at 1 on the first practice day', () => {
    expect(advanceStreak(fresh, '2025-03-01')).toEqual({ current: 1, longest: 1, lastDate: '2025-03-01' });
  });
  it('increments on consecutive days', () => {
    let s = advanceStreak(fresh, '2025-03-01');
    s = advanceStreak(s, '2025-03-02');
    s = advanceStreak(s, '2025-03-03');
    expect(s.current).toBe(3);
  });
  it('does not increment for multiple sessions on one day', () => {
    const a = advanceStreak(fresh, '2025-03-01');
    expect(advanceStreak(a, '2025-03-01')).toBe(a);
  });
  it('resets after a missed day but keeps the longest', () => {
    let s = advanceStreak(advanceStreak(fresh, '2025-03-01'), '2025-03-02');
    s = advanceStreak(s, '2025-03-05');
    expect(s).toEqual({ current: 1, longest: 2, lastDate: '2025-03-05' });
  });
  it('crosses month and year boundaries and leap days', () => {
    expect(advanceStreak({ current: 4, longest: 4, lastDate: '2024-12-31' }, '2025-01-01').current).toBe(5);
    expect(advanceStreak({ current: 1, longest: 1, lastDate: '2024-02-28' }, '2024-02-29').current).toBe(2);
    expect(daysBetween('2024-03-09', '2024-03-11')).toBe(2);
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
  });
  it('leaves the streak alone if the clock moved backwards', () => {
    const s = { current: 3, longest: 3, lastDate: '2025-03-10' };
    expect(advanceStreak(s, '2025-03-08')).toBe(s);
  });
  it('shows a streak as alive only through the next day', () => {
    const s = { current: 3, longest: 3, lastDate: '2025-03-10' };
    expect(currentStreak(s, '2025-03-10')).toBe(3);
    expect(currentStreak(s, '2025-03-11')).toBe(3);
    expect(currentStreak(s, '2025-03-12')).toBe(0);
    expect(currentStreak(fresh, '2025-03-12')).toBe(0);
  });
  it('builds date keys from local time', () => {
    expect(toDateKey(new Date(2025, 0, 5, 23, 59))).toBe('2025-01-05');
    expect(toDateKey(new Date(2025, 0, 6, 0, 1))).toBe('2025-01-06');
  });
});

describe('XP and rewards', () => {
  const pass = { id: 'm1-keyboard', passed: true, xp: 20 };

  it('awards lesson XP once and never on replay', () => {
    let s = makeState();
    const first = applyActivity(s, { session: makeSession({ id: 'a', type: 'lesson', refId: 'm1-keyboard' }), lesson: pass });
    s = first.state;
    expect(first.reward.lessonCompleted).toBe(true);
    expect(first.reward.items.some((i) => i.label === 'Lesson complete' && i.xp === 20)).toBe(true);
    const xpAfterFirst = s.xp.total;

    const replay = applyActivity(s, { session: makeSession({ id: 'b', type: 'lesson', refId: 'm1-keyboard', accuracy: 90, correct: 90 }), lesson: pass });
    expect(replay.reward.lessonCompleted).toBe(false);
    expect(replay.reward.items.some((i) => i.label === 'Lesson complete')).toBe(false);
    expect(replay.state.xp.total).toBe(xpAfterFirst);
    expect(replay.state.lessons['m1-keyboard'].attempts).toBe(2);
  });

  it('ignores a session that was already recorded (no double rewards)', () => {
    const session = makeSession({ id: 'dup' });
    const once = applyActivity(makeState(), { session });
    const twice = applyActivity(once.state, { session });
    expect(twice.reward.recorded).toBe(false);
    expect(twice.state).toBe(once.state);
    expect(twice.state.stats.totalSessions).toBe(1);
  });

  it('does not reward failed lesson attempts with lesson XP or completion', () => {
    const r = applyActivity(makeState(), {
      session: makeSession({ id: 'f', type: 'lesson', accuracy: 70, correct: 70 }),
      lesson: { id: 'm1-keyboard', passed: false, xp: 20 },
    });
    expect(r.state.lessons['m1-keyboard'].completed).toBe(false);
    expect(r.reward.items.some((i) => i.label === 'Lesson complete')).toBe(false);
  });

  it('caps practice XP per day', () => {
    let s = makeState();
    let total = 0;
    for (let i = 0; i < REWARDS.practice.dailyCap + 3; i++) {
      const r = applyActivity(s, { session: makeSession({ id: `p${i}`, accuracy: 80, correct: 80 }) });
      s = r.state;
      total += r.reward.items.filter((x) => x.label === 'Practice session').length;
    }
    expect(total).toBe(REWARDS.practice.dailyCap);
  });

  it('gives no practice XP for tiny or very short sessions', () => {
    const tiny = applyActivity(makeState(), { session: makeSession({ id: 't', typed: 5, correct: 5, accuracy: 100 }) });
    expect(tiny.reward.items.some((i) => i.label === 'Practice session')).toBe(false);
    const short = applyActivity(makeState(), { session: makeSession({ id: 'u', durationMs: 5000 }) });
    expect(short.reward.items.some((i) => i.label === 'Practice session')).toBe(false);
  });

  it('grants accuracy milestones only once', () => {
    let s = makeState();
    s = applyActivity(s, { session: makeSession({ id: 'm1', accuracy: 96, correct: 96 }) }).state;
    const again = applyActivity(s, { session: makeSession({ id: 'm2', accuracy: 97, correct: 97 }) });
    expect(again.reward.items.some((i) => i.label.includes('accuracy milestone'))).toBe(false);
    expect(s.xp.awarded['milestone:acc95']).toBeDefined();
  });

  it('awards a personal best only when a previous best exists and is beaten', () => {
    const base = (id: string, wpm: number) => makeSession({ id, type: 'test', netWpm: wpm, grossWpm: wpm, targetSec: 60 });
    const first = applyActivity(makeState(), { session: base('t1', 30) });
    expect(first.reward.personalBest).toBe(false);
    const better = applyActivity(first.state, { session: base('t2', 35) });
    expect(better.reward.personalBest).toBe(true);
    const worse = applyActivity(better.state, { session: base('t3', 20) });
    expect(worse.reward.personalBest).toBe(false);
    expect(worse.state.stats.bestTestWpm).toBe(35);
  });

  it('completes the daily challenge once per date', () => {
    const date = '2025-01-10';
    const c = challengeForDate(date);
    expect(challengeForDate(date)).toBe(c);
    expect(challengeProgress(c, undefined).done).toBe(false);
    let s = makeState();
    let completions = 0;
    for (let i = 0; i < 12; i++) {
      const r = applyActivity(s, { session: makeSession({ id: `c${i}`, date, durationMs: 120_000, accuracy: 99, correct: 99, netWpm: 40, grossWpm: 40 }), lesson: { id: 'm1-keyboard', passed: true, xp: 20 } });
      s = r.state;
      if (r.reward.challengeCompleted) completions++;
    }
    expect(completions).toBe(1);
    expect(s.challenges[date]).toBeDefined();
  });

  it('tracks the streak through recorded sessions', () => {
    let s = applyActivity(makeState(), { session: makeSession({ id: 'd1', date: '2025-01-10' }) }).state;
    s = applyActivity(s, { session: makeSession({ id: 'd1b', date: '2025-01-10' }) }).state;
    s = applyActivity(s, { session: makeSession({ id: 'd2', date: '2025-01-11' }) }).state;
    expect(s.streak.current).toBe(2);
  });
});

describe('achievements', () => {
  const unlocked = (s: ReturnType<typeof makeState>) => Object.keys(s.achievements);

  it('unlocks nothing for a brand-new state', () => {
    expect(ACHIEVEMENTS.filter((a) => a.progress(makeState()).value >= a.progress(makeState()).target)).toHaveLength(0);
  });

  it('unlocks First Steps when a lesson is passed', () => {
    const r = applyActivity(makeState(), {
      session: makeSession({ id: 'l', type: 'lesson' }),
      lesson: { id: 'm1-keyboard', passed: true, xp: 20 },
    });
    expect(unlocked(r.state)).toContain('first-steps');
    expect(r.reward.achievements).toContain('first-steps');
    expect(r.state.xp.awarded['ach:first-steps']).toBeDefined();
  });

  it('does not unlock First Steps for a failed attempt', () => {
    const r = applyActivity(makeState(), {
      session: makeSession({ id: 'l', type: 'lesson' }),
      lesson: { id: 'm1-keyboard', passed: false, xp: 20 },
    });
    expect(unlocked(r.state)).not.toContain('first-steps');
  });

  it('unlocks speed and accuracy achievements from real sessions', () => {
    const r = applyActivity(makeState(), { session: makeSession({ id: 'x', netWpm: 41, grossWpm: 41, accuracy: 100, correct: 100 }) });
    expect(unlocked(r.state)).toEqual(expect.arrayContaining(['speed-starter', 'speed-builder', 'accuracy-first', 'perfect-session']));
    expect(unlocked(r.state)).not.toContain('fast-fingers');
  });

  it('ignores tiny sessions for speed and perfect-session achievements', () => {
    const r = applyActivity(makeState(), { session: makeSession({ id: 'y', typed: 5, correct: 5, netWpm: 90, grossWpm: 90, accuracy: 100 }) });
    expect(unlocked(r.state)).not.toContain('fast-fingers');
    expect(unlocked(r.state)).not.toContain('perfect-session');
  });

  it('ignores very short bursts for speed records', () => {
    const r = applyActivity(makeState(), { session: makeSession({ id: 'burst', typed: 40, correct: 40, durationMs: 3000, netWpm: 160, grossWpm: 160, accuracy: 100 }) });
    expect(r.state.stats.bestWpm).toBe(0);
    expect(unlocked(r.state)).not.toContain('speed-starter');
  });

  it('never unlocks the same achievement twice or re-awards its XP', () => {
    const s1 = applyActivity(makeState(), { session: makeSession({ id: 'a', netWpm: 25, grossWpm: 25 }) }).state;
    const xp = s1.xp.total;
    const s2 = applyActivity(s1, { session: makeSession({ id: 'b', netWpm: 26, grossWpm: 26, durationMs: 1000, typed: 20 }) });
    expect(s2.reward.achievements).not.toContain('speed-starter');
    expect(s2.state.xp.total).toBeGreaterThanOrEqual(xp);
  });

  it('unlocks Consistent Learner after a seven day streak', () => {
    let s = makeState();
    for (let i = 0; i < 7; i++) s = applyActivity(s, { session: makeSession({ id: `k${i}`, date: addDays('2025-02-01', i) }) }).state;
    expect(s.streak.longest).toBe(7);
    expect(unlocked(s)).toContain('consistent-learner');
  });
});
