import type { SessionRecord, SessionType } from '../types';
import { toDateKey } from './dates';
import type { AttemptSummary } from './progression';
import { metricsOf, type EngineState } from './typingEngine';
import { round1 } from './typingMetrics';

interface Meta {
  type: SessionType;
  refId: string;
  label: string;
  targetSec?: number | null;
}

/** Turns a finished engine run into a saved session. Unfinished runs return null and are never saved. */
export function sessionFromEngine(s: EngineState, meta: Meta): SessionRecord | null {
  if (s.status !== 'finished' || s.startedAt === null || s.wallStart === null || s.typed === 0) return null;
  const m = metricsOf(s, s.endedAt ?? s.startedAt);
  return {
    id: `${meta.type}-${s.wallStart}-${meta.refId}`,
    type: meta.type,
    refId: meta.refId,
    label: meta.label,
    startedAt: s.wallStart,
    date: toDateKey(s.wallStart),
    durationMs: Math.round(m.elapsedMs),
    targetSec: meta.targetSec ?? null,
    typed: m.typed,
    correct: m.correct,
    incorrect: m.incorrect,
    uncorrected: m.uncorrected,
    grossWpm: round1(m.grossWpm),
    netWpm: round1(m.netWpm),
    accuracy: round1(m.accuracy),
    keyErrors: s.keyErrors,
    keyTotals: s.keyTotals,
  };
}

/** One saved session for a whole lesson attempt (all exercises combined). */
export function sessionFromAttempt(
  lessonId: string,
  label: string,
  startedAt: number,
  summary: AttemptSummary,
): SessionRecord {
  const m = summary.metrics;
  return {
    id: `lesson-${startedAt}-${lessonId}`,
    type: 'lesson',
    refId: lessonId,
    label,
    startedAt,
    date: toDateKey(startedAt),
    durationMs: Math.round(m.elapsedMs),
    targetSec: null,
    typed: m.typed,
    correct: m.correct,
    incorrect: m.incorrect,
    uncorrected: m.uncorrected,
    grossWpm: round1(m.grossWpm),
    netWpm: round1(m.netWpm),
    accuracy: round1(m.accuracy),
    keyErrors: summary.keyErrors,
    keyTotals: summary.keyTotals,
  };
}
