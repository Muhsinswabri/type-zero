import type { Metrics } from '../types';
import { buildMetrics } from './typingMetrics';

export interface EngineOptions {
  /** Backspace deletes the previous character. */
  allowBackspace: boolean;
  /** A wrong key is counted but the cursor stays put until the right key is pressed. */
  stopOnError: boolean;
  /** Time limit in ms measured from the first keystroke, or null for untimed. */
  limitMs: number | null;
}

export type EngineStatus = 'idle' | 'running' | 'finished';

export interface LastKey {
  typed: string;
  expected: string;
  ok: boolean;
  seq: number;
}

export interface EngineState {
  target: string;
  opts: EngineOptions;
  status: EngineStatus;
  input: string;
  typed: number;
  correct: number;
  incorrect: number;
  backspaces: number;
  keyErrors: Record<string, number>;
  keyTotals: Record<string, number>;
  /** Monotonic timestamp (performance.now) of the first keystroke. */
  startedAt: number | null;
  /** Wall-clock timestamp (Date.now) of the first keystroke, for the session record. */
  wallStart: number | null;
  endedAt: number | null;
  lastKey: LastKey | null;
  seq: number;
}

export const DEFAULT_OPTIONS: EngineOptions = { allowBackspace: true, stopOnError: false, limitMs: null };

export function createEngine(target: string, opts: EngineOptions = DEFAULT_OPTIONS): EngineState {
  return {
    target,
    opts,
    status: 'idle',
    input: '',
    typed: 0,
    correct: 0,
    incorrect: 0,
    backspaces: 0,
    keyErrors: {},
    keyTotals: {},
    startedAt: null,
    wallStart: null,
    endedAt: null,
    lastKey: null,
    seq: 0,
  };
}

export function isPrintable(ch: string): boolean {
  return ch.length === 1 && ch >= ' ' && ch !== '\u007f';
}

/** Letters are tracked case-insensitively so Shift mistakes count against the letter key. */
export function normKey(ch: string): string {
  return ch >= 'A' && ch <= 'Z' ? ch.toLowerCase() : ch;
}

export function typeChar(s: EngineState, ch: string, now: number, wall: number = Date.now()): EngineState {
  if (s.status === 'finished' || s.target.length === 0 || !isPrintable(ch)) return s;

  let st = s;
  if (st.status === 'idle') st = { ...st, status: 'running', startedAt: now, wallStart: wall };
  const startedAt = st.startedAt as number;

  if (st.opts.limitMs !== null && now - startedAt >= st.opts.limitMs) {
    return { ...st, status: 'finished', endedAt: startedAt + st.opts.limitMs };
  }

  const expected = st.target[st.input.length];
  const ok = ch === expected;
  const k = normKey(expected);
  const keyTotals = { ...st.keyTotals, [k]: (st.keyTotals[k] ?? 0) + 1 };
  const keyErrors = ok ? st.keyErrors : { ...st.keyErrors, [k]: (st.keyErrors[k] ?? 0) + 1 };
  const advance = ok || !st.opts.stopOnError;
  const input = advance ? st.input + ch : st.input;
  const done = input.length >= st.target.length;
  const seq = st.seq + 1;

  return {
    ...st,
    input,
    typed: st.typed + 1,
    correct: st.correct + (ok ? 1 : 0),
    incorrect: st.incorrect + (ok ? 0 : 1),
    keyTotals,
    keyErrors,
    seq,
    lastKey: { typed: ch, expected, ok, seq },
    status: done ? 'finished' : 'running',
    endedAt: done ? now : null,
  };
}

export function backspace(s: EngineState): EngineState {
  if (s.status !== 'running' || !s.opts.allowBackspace || s.opts.stopOnError || s.input.length === 0) return s;
  return { ...s, input: s.input.slice(0, -1), backspaces: s.backspaces + 1 };
}

/** Ends a running session (time up). Idle or finished sessions are returned unchanged. */
export function finish(s: EngineState, now: number): EngineState {
  if (s.status !== 'running' || s.startedAt === null) return s;
  const cap = s.opts.limitMs === null ? now : Math.min(now, s.startedAt + s.opts.limitMs);
  return { ...s, status: 'finished', endedAt: cap };
}

export function uncorrectedErrors(s: EngineState): number {
  let n = 0;
  for (let i = 0; i < s.input.length; i++) if (s.input[i] !== s.target[i]) n++;
  return n;
}

export function elapsedOf(s: EngineState, now: number): number {
  if (s.startedAt === null) return 0;
  const end = s.endedAt ?? now;
  const raw = Math.max(0, end - s.startedAt);
  return s.opts.limitMs === null ? raw : Math.min(raw, s.opts.limitMs);
}

export function metricsOf(s: EngineState, now: number): Metrics {
  return buildMetrics(s.typed, s.correct, uncorrectedErrors(s), elapsedOf(s, now));
}

export function isComplete(s: EngineState): boolean {
  return s.target.length > 0 && s.input.length >= s.target.length;
}
