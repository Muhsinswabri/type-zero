import { createDefaultState } from '../lib/defaults';
import type { StorageLike } from '../lib/storage';
import type { AppState, SessionRecord } from '../types';

export function makeSession(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: `s-${Math.random().toString(36).slice(2)}`,
    type: 'practice',
    refId: 'words',
    label: 'Practice',
    startedAt: new Date(2025, 0, 10, 12).getTime(),
    date: '2025-01-10',
    durationMs: 60_000,
    targetSec: 60,
    typed: 100,
    correct: 95,
    incorrect: 5,
    uncorrected: 0,
    grossWpm: 20,
    netWpm: 20,
    accuracy: 95,
    keyErrors: {},
    keyTotals: {},
    ...over,
  };
}

export function makeState(over: Partial<AppState> = {}): AppState {
  return { ...createDefaultState(), ...over };
}

export class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  failWith: Error | null = null;
  /** Fail writes whose payload is longer than this many characters. */
  maxLength = Infinity;

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWith) throw this.failWith;
    if (value.length > this.maxLength) {
      const e = new Error('quota');
      e.name = 'QuotaExceededError';
      throw e;
    }
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}
