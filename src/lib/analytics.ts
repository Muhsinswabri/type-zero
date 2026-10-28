import type { AppState, DailyActivity, SessionRecord } from '../types';
import { addDays, formatShortDate, lastNDays, toDateKey } from './dates';
import { accuracy, countsForSpeed, round1 } from './typingMetrics';

export type RangeId = '7d' | '30d' | 'all';

export const RANGES: { id: RangeId; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
];

function rangeStart(range: RangeId, today: string): string | null {
  if (range === '7d') return addDays(today, -6);
  if (range === '30d') return addDays(today, -29);
  return null;
}

export function sessionsInRange(sessions: SessionRecord[], range: RangeId, today: string = toDateKey()): SessionRecord[] {
  const start = rangeStart(range, today);
  return start === null ? sessions : sessions.filter((s) => s.date >= start);
}

const qualifying = (s: SessionRecord) => countsForSpeed(s);

export interface DayPoint {
  date: string;
  label: string;
  wpm: number | null;
  accuracy: number | null;
  sessions: number;
  minutes: number;
}

/** One point per day that has sessions. Days without practice are not invented. */
export function dayPoints(sessions: SessionRecord[]): DayPoint[] {
  const byDate = new Map<string, SessionRecord[]>();
  for (const s of sessions) {
    const list = byDate.get(s.date);
    if (list) list.push(s);
    else byDate.set(s.date, [s]);
  }
  return [...byDate.keys()].sort().map((date) => {
    const list = byDate.get(date) as SessionRecord[];
    const speedy = list.filter(qualifying);
    const scored = list.filter((s) => s.accuracy !== null && s.typed > 0);
    const typed = scored.reduce((n, s) => n + s.typed, 0);
    const correct = scored.reduce((n, s) => n + s.correct, 0);
    return {
      date,
      label: formatShortDate(date),
      wpm: speedy.length ? round1(speedy.reduce((n, s) => n + s.netWpm, 0) / speedy.length) : null,
      accuracy: scored.length ? round1(accuracy(correct, typed)) : null,
      sessions: list.length,
      minutes: round1(list.reduce((n, s) => n + s.durationMs, 0) / 60_000),
    };
  });
}

export interface ActivityPoint {
  date: string;
  label: string;
  minutes: number;
}

/** Practice minutes per calendar day from the long-lived daily log. */
export function activityPoints(daily: Record<string, DailyActivity>, range: RangeId, today: string = toDateKey()): ActivityPoint[] {
  let dates: string[];
  if (range === '7d') dates = lastNDays(7, today);
  else if (range === '30d') dates = lastNDays(30, today);
  else {
    const keys = Object.keys(daily).sort();
    if (keys.length === 0) return [];
    dates = lastNDays(90, today).filter((d) => d >= keys[0]);
  }
  return dates.map((date) => ({
    date,
    label: formatShortDate(date),
    minutes: round1((daily[date]?.durationMs ?? 0) / 60_000),
  }));
}

export interface Summary {
  sessions: number;
  bestWpm: number | null;
  avgWpm: number | null;
  avgAccuracy: number | null;
  totalMs: number;
}

export function summarize(sessions: SessionRecord[]): Summary {
  const speedy = sessions.filter(qualifying);
  const scored = sessions.filter((s) => s.accuracy !== null && s.typed > 0);
  const typed = scored.reduce((n, s) => n + s.typed, 0);
  const correct = scored.reduce((n, s) => n + s.correct, 0);
  return {
    sessions: sessions.length,
    bestWpm: speedy.length ? Math.max(...speedy.map((s) => s.netWpm)) : null,
    avgWpm: speedy.length ? round1(speedy.reduce((n, s) => n + s.netWpm, 0) / speedy.length) : null,
    avgAccuracy: scored.length ? round1(accuracy(correct, typed)) : null,
    totalMs: sessions.reduce((n, s) => n + s.durationMs, 0),
  };
}

export function sumKeyCounts(sessions: SessionRecord[]): { keyErrors: Record<string, number>; keyTotals: Record<string, number> } {
  const keyErrors: Record<string, number> = {};
  const keyTotals: Record<string, number> = {};
  for (const s of sessions) {
    for (const [k, v] of Object.entries(s.keyErrors)) keyErrors[k] = (keyErrors[k] ?? 0) + v;
    for (const [k, v] of Object.entries(s.keyTotals)) keyTotals[k] = (keyTotals[k] ?? 0) + v;
  }
  return { keyErrors, keyTotals };
}

/** Average net WPM of the five most recent qualifying sessions, or null with no history. */
export function recentSpeed(state: AppState): number | null {
  const recent = state.sessions.filter(qualifying).slice(-5);
  if (recent.length === 0) return null;
  return round1(recent.reduce((n, s) => n + s.netWpm, 0) / recent.length);
}

/** Lifetime keystroke accuracy over scored sessions, or null with no history. */
export function lifetimeAccuracy(state: AppState): number | null {
  const { totalTyped, totalCorrect } = state.stats;
  return totalTyped > 0 ? round1(accuracy(totalCorrect, totalTyped)) : null;
}
