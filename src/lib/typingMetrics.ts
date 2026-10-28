import { REWARDS } from '../data/rewards';
import type { Metrics } from '../types';

/**
 * Short bursts are too noisy to rank, so speed records (best/average WPM, speed achievements,
 * personal bests) need at least `minQualifyChars` keystrokes over at least `minSpeedMs`.
 */
export function countsForSpeed(s: { typed: number; durationMs: number }): boolean {
  return s.typed >= REWARDS.minQualifyChars && s.durationMs >= REWARDS.minSpeedMs;
}

/**
 * Metric conventions used everywhere in TypeZero (lessons, tests, practice, analytics):
 *
 * - "typed"       = every character keystroke (Backspace excluded), including mistakes later corrected.
 * - "correct"     = keystrokes that matched the expected character at that moment.
 * - "incorrect"   = keystrokes that did not match (even if corrected afterwards).
 * - "uncorrected" = characters still wrong in the final input.
 *
 * Gross WPM = (typed / 5) / minutes
 * Net WPM   = max(0, (typed / 5 - uncorrected) / minutes)   (gross WPM minus uncorrected errors per minute)
 * Accuracy  = correct / typed * 100   (keystroke accuracy: corrected mistakes still count against it)
 *
 * Elapsed time is floored at one second so very short sessions never divide by ~zero.
 */
export const CHARS_PER_WORD = 5;
export const MIN_ELAPSED_MS = 1000;

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export const round1 = (n: number) => Math.round(n * 10) / 10;

export function elapsedMinutes(elapsedMs: number): number {
  return Math.max(elapsedMs, MIN_ELAPSED_MS) / 60_000;
}

export function grossWpm(typed: number, elapsedMs: number): number {
  if (typed <= 0) return 0;
  return typed / CHARS_PER_WORD / elapsedMinutes(elapsedMs);
}

export function netWpm(typed: number, uncorrected: number, elapsedMs: number): number {
  if (typed <= 0) return 0;
  const words = typed / CHARS_PER_WORD - Math.max(0, uncorrected);
  return Math.max(0, words / elapsedMinutes(elapsedMs));
}

/** Accuracy in percent, capped to 0..100. With nothing typed it reports 100. */
export function accuracy(correct: number, typed: number): number {
  if (typed <= 0) return 100;
  return clamp((correct / typed) * 100, 0, 100);
}

export function buildMetrics(typed: number, correct: number, uncorrected: number, elapsedMs: number): Metrics {
  return {
    elapsedMs,
    typed,
    correct,
    incorrect: Math.max(0, typed - correct),
    uncorrected,
    grossWpm: grossWpm(typed, elapsedMs),
    netWpm: netWpm(typed, uncorrected, elapsedMs),
    accuracy: accuracy(correct, typed),
  };
}

export function mergeCounts(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + v;
  return out;
}

export interface WeakKey {
  key: string;
  errors: number;
  total: number;
  rate: number;
}

/** Keys ranked by error rate (then error count). Keys with too few attempts are ignored. */
export function weakKeys(
  keyErrors: Record<string, number>,
  keyTotals: Record<string, number>,
  { minAttempts = 5, limit = 8 }: { minAttempts?: number; limit?: number } = {},
): WeakKey[] {
  const out: WeakKey[] = [];
  for (const [key, errors] of Object.entries(keyErrors)) {
    const total = keyTotals[key] ?? 0;
    if (key === ' ' || errors <= 0 || total < minAttempts) continue;
    out.push({ key, errors, total, rate: Math.min(1, errors / total) });
  }
  out.sort((a, b) => b.rate - a.rate || b.errors - a.errors || a.key.localeCompare(b.key));
  return out.slice(0, limit);
}

/** Keys with the most mistakes overall, regardless of rate. */
export function commonErrors(keyErrors: Record<string, number>, limit = 8): { key: string; errors: number }[] {
  return Object.entries(keyErrors)
    .filter(([key, errors]) => key !== ' ' && errors > 0)
    .map(([key, errors]) => ({ key, errors }))
    .sort((a, b) => b.errors - a.errors || a.key.localeCompare(b.key))
    .slice(0, limit);
}
