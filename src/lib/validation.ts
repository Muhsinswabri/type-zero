import { MAX_DAILY_ENTRIES, MAX_SESSIONS } from '../data/rewards';
import type {
  AppState,
  DailyActivity,
  LessonProgress,
  SessionRecord,
  Settings,
  Stats,
} from '../types';
import { createDefaultState, defaultSettings, emptyDaily, emptyStats, SCHEMA_VERSION } from './defaults';
import { countsForSpeed } from './typingMetrics';
import { isDateKey } from './dates';

type Obj = Record<string, unknown>;

export const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);

function num(x: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : fallback;
}

function oneOf<T extends string | number>(x: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(x as T) ? (x as T) : fallback;
}

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function countMap(x: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x)) {
    if (!UNSAFE_KEYS.has(k) && k.length > 0 && k.length <= 2 && typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = Math.floor(v);
  }
  return out;
}

function sanitizeSettings(raw: unknown, issue: (m: string) => void): Settings {
  const d = defaultSettings();
  if (raw === undefined) return d;
  if (!isObj(raw)) {
    issue('settings');
    return d;
  }
  return {
    theme: oneOf(raw.theme, ['dark', 'light'] as const, d.theme),
    dailyGoalMinutes: oneOf(raw.dailyGoalMinutes, [5, 10, 15, 20] as const, d.dailyGoalMinutes),
    sound: typeof raw.sound === 'boolean' ? raw.sound : d.sound,
    fingerGuidance: typeof raw.fingerGuidance === 'boolean' ? raw.fingerGuidance : d.fingerGuidance,
    errorStyle: oneOf(raw.errorStyle, ['underline', 'highlight'] as const, d.errorStyle),
    difficulty: oneOf(raw.difficulty, ['easy', 'medium', 'hard'] as const, d.difficulty),
    testDuration: oneOf(raw.testDuration, [15, 30, 60, 120] as const, d.testDuration),
    reducedMotion: typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : d.reducedMotion,
    layout: oneOf(raw.layout, ['qwerty'] as const, d.layout),
    unlockAllLessons: typeof raw.unlockAllLessons === 'boolean' ? raw.unlockAllLessons : d.unlockAllLessons,
  };
}

export function sanitizeSession(raw: unknown): SessionRecord | null {
  if (!isObj(raw)) return null;
  if (typeof raw.id !== 'string' || raw.id.length === 0 || raw.id.length > 80) return null;
  if (raw.type !== 'lesson' && raw.type !== 'practice' && raw.type !== 'test') return null;
  if (typeof raw.startedAt !== 'number' || !Number.isFinite(raw.startedAt)) return null;
  if (!isDateKey(raw.date)) return null;
  const typed = Math.floor(num(raw.typed, 0));
  const correct = Math.min(typed, Math.floor(num(raw.correct, 0)));
  const accuracy = raw.accuracy === null ? null : num(raw.accuracy, 0, 0, 100);
  return {
    id: raw.id,
    type: raw.type,
    refId: typeof raw.refId === 'string' ? raw.refId.slice(0, 80) : '',
    label: typeof raw.label === 'string' ? raw.label.slice(0, 120) : '',
    startedAt: raw.startedAt,
    date: raw.date,
    durationMs: num(raw.durationMs, 0, 0, 24 * 3_600_000),
    targetSec: raw.targetSec === null || raw.targetSec === undefined ? null : num(raw.targetSec, 0, 0, 86_400),
    typed,
    correct,
    incorrect: Math.floor(num(raw.incorrect, typed - correct)),
    uncorrected: Math.floor(num(raw.uncorrected, 0)),
    grossWpm: num(raw.grossWpm, 0, 0, 1000),
    netWpm: num(raw.netWpm, 0, 0, 1000),
    accuracy,
    keyErrors: countMap(raw.keyErrors),
    keyTotals: countMap(raw.keyTotals),
  };
}

function sanitizeLessons(raw: unknown, issue: (m: string) => void): Record<string, LessonProgress> {
  const out: Record<string, LessonProgress> = {};
  if (raw === undefined) return out;
  if (!isObj(raw)) {
    issue('lesson progress');
    return out;
  }
  for (const [id, v] of Object.entries(raw)) {
    if (UNSAFE_KEYS.has(id)) continue;
    if (!isObj(v)) {
      issue(`lesson ${id}`);
      continue;
    }
    out[id] = {
      attempts: Math.floor(num(v.attempts, 0)),
      completed: v.completed === true,
      bestAccuracy: num(v.bestAccuracy, 0, 0, 100),
      bestWpm: num(v.bestWpm, 0, 0, 1000),
      completedAt: typeof v.completedAt === 'number' && Number.isFinite(v.completedAt) ? v.completedAt : null,
    };
  }
  return out;
}

function sanitizeDaily(raw: unknown, issue: (m: string) => void): Record<string, DailyActivity> {
  const out: Record<string, DailyActivity> = {};
  if (raw === undefined) return out;
  if (!isObj(raw)) {
    issue('daily activity');
    return out;
  }
  const keys = Object.keys(raw).filter(isDateKey).sort().slice(-MAX_DAILY_ENTRIES);
  for (const key of keys) {
    const v = raw[key];
    if (!isObj(v)) {
      issue(`daily ${key}`);
      continue;
    }
    const base = emptyDaily();
    const rewarded = isObj(v.rewarded) ? v.rewarded : {};
    out[key] = {
      sessions: Math.floor(num(v.sessions, base.sessions)),
      durationMs: num(v.durationMs, 0),
      typed: Math.floor(num(v.typed, 0)),
      lessons: Math.floor(num(v.lessons, 0)),
      bestWpm: num(v.bestWpm, 0, 0, 1000),
      bestAccuracy: num(v.bestAccuracy, 0, 0, 100),
      xp: Math.floor(num(v.xp, 0)),
      rewarded: {
        practice: Math.floor(num(rewarded.practice, 0)),
        test: Math.floor(num(rewarded.test, 0)),
      },
    };
  }
  return out;
}

/** Rebuilds lifetime stats from whatever history is available (used when stats are missing). */
export function rebuildStats(sessions: SessionRecord[]): Stats {
  const s = emptyStats();
  for (const x of sessions) {
    const qualifies = x.typed >= 20;
    s.totalSessions++;
    if (x.type === 'lesson') s.lessonSessions++;
    if (x.type === 'practice') s.practiceSessions++;
    if (x.type === 'test') s.testSessions++;
    s.totalDurationMs += x.durationMs;
    if (x.accuracy !== null) {
      s.totalTyped += x.typed;
      s.totalCorrect += x.correct;
      if (qualifies) {
        s.bestAccuracy = Math.max(s.bestAccuracy, x.accuracy);
        if (x.accuracy === 100) s.perfectSessions++;
      }
      for (const [k, v] of Object.entries(x.keyErrors)) s.keyErrors[k] = (s.keyErrors[k] ?? 0) + v;
      for (const [k, v] of Object.entries(x.keyTotals)) s.keyTotals[k] = (s.keyTotals[k] ?? 0) + v;
    }
    if (countsForSpeed(x)) {
      s.wpmSum += x.netWpm;
      s.wpmCount++;
      s.bestWpm = Math.max(s.bestWpm, x.netWpm);
      if (x.type === 'test') s.bestTestWpm = Math.max(s.bestTestWpm, x.netWpm);
    }
  }
  return s;
}

function sanitizeStats(raw: unknown, sessions: SessionRecord[], issue: (m: string) => void): Stats {
  if (raw === undefined) return rebuildStats(sessions);
  if (!isObj(raw)) {
    issue('statistics');
    return rebuildStats(sessions);
  }
  const d = emptyStats();
  return {
    totalSessions: Math.floor(num(raw.totalSessions, d.totalSessions)),
    lessonSessions: Math.floor(num(raw.lessonSessions, 0)),
    practiceSessions: Math.floor(num(raw.practiceSessions, 0)),
    testSessions: Math.floor(num(raw.testSessions, 0)),
    totalDurationMs: num(raw.totalDurationMs, 0),
    totalTyped: Math.floor(num(raw.totalTyped, 0)),
    totalCorrect: Math.floor(num(raw.totalCorrect, 0)),
    wpmSum: num(raw.wpmSum, 0),
    wpmCount: Math.floor(num(raw.wpmCount, 0)),
    bestWpm: num(raw.bestWpm, 0, 0, 1000),
    bestTestWpm: num(raw.bestTestWpm, 0, 0, 1000),
    bestAccuracy: num(raw.bestAccuracy, 0, 0, 100),
    perfectSessions: Math.floor(num(raw.perfectSessions, 0)),
    keyErrors: countMap(raw.keyErrors),
    keyTotals: countMap(raw.keyTotals),
  };
}

function numberMap(raw: unknown, keyFilter?: (k: string) => boolean): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (UNSAFE_KEYS.has(k) || (keyFilter && !keyFilter(k))) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export interface SanitizeResult {
  state: AppState;
  /** Names of sections that held invalid data and were reset or dropped. */
  issues: string[];
  droppedSessions: number;
}

/**
 * Builds a valid AppState from untrusted data. Each section is validated on its own, so one
 * malformed field never wipes the rest of the saved progress.
 */
export function sanitizeState(raw: unknown): SanitizeResult {
  const issues: string[] = [];
  const issue = (m: string) => {
    if (!issues.includes(m)) issues.push(m);
  };
  const base = createDefaultState();
  if (!isObj(raw)) return { state: base, issues: ['saved data'], droppedSessions: 0 };

  let droppedSessions = 0;
  const sessions: SessionRecord[] = [];
  if (raw.sessions !== undefined) {
    if (!Array.isArray(raw.sessions)) {
      issue('session history');
    } else {
      const seen = new Set<string>();
      for (const item of raw.sessions) {
        const rec = sanitizeSession(item);
        if (!rec || seen.has(rec.id)) {
          droppedSessions++;
          continue;
        }
        seen.add(rec.id);
        sessions.push(rec);
      }
      if (droppedSessions > 0) issue('some sessions');
    }
  }
  sessions.sort((a, b) => a.startedAt - b.startedAt);

  const xpRaw = isObj(raw.xp) ? raw.xp : null;
  if (raw.xp !== undefined && !xpRaw) issue('XP');
  const streakRaw = isObj(raw.streak) ? raw.streak : null;
  if (raw.streak !== undefined && !streakRaw) issue('streak');

  const state: AppState = {
    version: SCHEMA_VERSION,
    onboarded: raw.onboarded === true,
    startLevel: oneOf(raw.startLevel, ['beginner', 'intermediate', 'advanced'] as const, base.startLevel),
    settings: sanitizeSettings(raw.settings, issue),
    lessons: sanitizeLessons(raw.lessons, issue),
    sessions: sessions.slice(-MAX_SESSIONS),
    stats: sanitizeStats(raw.stats, sessions, issue),
    xp: {
      total: Math.floor(num(xpRaw?.total, 0)),
      awarded: numberMap(xpRaw?.awarded),
    },
    achievements: numberMap(raw.achievements),
    streak: {
      current: Math.floor(num(streakRaw?.current, 0)),
      longest: Math.floor(num(streakRaw?.longest, 0)),
      lastDate: isDateKey(streakRaw?.lastDate) ? (streakRaw?.lastDate as string) : null,
    },
    daily: sanitizeDaily(raw.daily, issue),
    challenges: numberMap(raw.challenges, isDateKey),
  };
  state.streak.longest = Math.max(state.streak.longest, state.streak.current);
  return { state, issues, droppedSessions };
}

/* --------------------------------------------------------------- export/import */

export interface ExportFile {
  app: 'typezero';
  schemaVersion: number;
  exportedAt: string;
  onboarded: boolean;
  startLevel: AppState['startLevel'];
  settings: AppState['settings'];
  lessons: AppState['lessons'];
  sessions: AppState['sessions'];
  stats: AppState['stats'];
  xp: AppState['xp'];
  achievements: AppState['achievements'];
  streak: AppState['streak'];
  daily: AppState['daily'];
  challenges: AppState['challenges'];
}

export function buildExport(state: AppState, now: Date = new Date()): ExportFile {
  return {
    app: 'typezero',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    onboarded: state.onboarded,
    startLevel: state.startLevel,
    settings: state.settings,
    lessons: state.lessons,
    sessions: state.sessions,
    stats: state.stats,
    xp: state.xp,
    achievements: state.achievements,
    streak: state.streak,
    daily: state.daily,
    challenges: state.challenges,
  };
}

export type ImportResult =
  | { ok: true; state: AppState; issues: string[]; exportedAt: string | null }
  | { ok: false; error: string };

/** Validates a parsed JSON value as a TypeZero export. Never executes anything from the file. */
export function validateImport(raw: unknown): ImportResult {
  if (!isObj(raw)) return { ok: false, error: 'This file is not a TypeZero export (expected a JSON object).' };
  if (raw.app !== 'typezero') return { ok: false, error: 'This file was not created by TypeZero.' };
  if (typeof raw.schemaVersion !== 'number' || !Number.isInteger(raw.schemaVersion) || raw.schemaVersion < 1) {
    return { ok: false, error: 'The file has no valid schema version.' };
  }
  if (raw.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `This export uses schema version ${raw.schemaVersion}, which is newer than this app supports (${SCHEMA_VERSION}). Update TypeZero and try again.`,
    };
  }
  const required: [string, (x: unknown) => boolean][] = [
    ['settings', isObj],
    ['lessons', isObj],
    ['sessions', Array.isArray],
    ['xp', isObj],
    ['achievements', isObj],
    ['daily', isObj],
  ];
  for (const [field, check] of required) {
    if (!check(raw[field])) return { ok: false, error: `The file is missing a valid "${field}" section.` };
  }
  const migrated = migrate(raw);
  const { state, issues, droppedSessions } = sanitizeState(migrated);
  const sessionCount = (raw.sessions as unknown[]).length;
  if (sessionCount > 0 && droppedSessions === sessionCount) {
    return { ok: false, error: 'None of the sessions in this file were valid.' };
  }
  return {
    ok: true,
    state,
    issues,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null,
  };
}

/** Upgrades data from older schema versions. Version 1 is current, so this is the extension point. */
export function migrate(raw: Obj): Obj {
  let data = raw;
  let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : typeof data.version === 'number' ? data.version : 1;
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) break;
    data = step(data);
    version++;
  }
  return data;
}

const MIGRATIONS: Record<number, (d: Obj) => Obj> = {};
