import type { AppState } from '../types';
import { createDefaultState, SCHEMA_VERSION } from './defaults';
import { isObj, migrate, sanitizeState } from './validation';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORAGE_KEY = 'typezero:state';
export const BACKUP_KEY = 'typezero:backup';

/** Returns localStorage if it can be written to, otherwise null (private mode, blocked, etc.). */
export function getStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = window.localStorage;
    const probe = 'typezero:probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export interface LoadResult {
  state: AppState;
  /** False when storage is unavailable and progress will only live in memory. */
  persistent: boolean;
  notice: string | null;
}

function keepBackup(storage: StorageLike, raw: string): void {
  try {
    storage.setItem(BACKUP_KEY, raw);
  } catch {
    /* backup is best effort */
  }
}

export function loadState(storage: StorageLike | null = getStorage()): LoadResult {
  if (!storage) {
    return {
      state: createDefaultState(),
      persistent: false,
      notice: 'Browser storage is unavailable, so your progress will not be saved after you close this page.',
    };
  }

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return {
      state: createDefaultState(),
      persistent: false,
      notice: 'Browser storage could not be read, so your progress will not be saved after you close this page.',
    };
  }
  if (raw === null) return { state: createDefaultState(), persistent: true, notice: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    keepBackup(storage, raw);
    return {
      state: createDefaultState(),
      persistent: true,
      notice: 'Your saved data could not be read, so TypeZero started fresh. A backup copy of the old data was kept in this browser.',
    };
  }

  if (!isObj(parsed)) {
    keepBackup(storage, raw);
    return {
      state: createDefaultState(),
      persistent: true,
      notice: 'Your saved data had an unexpected format, so TypeZero started fresh. A backup copy was kept in this browser.',
    };
  }

  if (typeof parsed.version === 'number' && parsed.version > SCHEMA_VERSION) {
    keepBackup(storage, raw);
    return {
      state: createDefaultState(),
      persistent: false,
      notice: 'Your saved progress was created by a newer version of TypeZero. It has been left untouched and will not be overwritten in this session.',
    };
  }

  const { state, issues } = sanitizeState(migrate(parsed));
  if (issues.length > 0) {
    keepBackup(storage, raw);
    return {
      state,
      persistent: true,
      notice: `Some saved values were invalid and were reset (${issues.join(', ')}). The rest of your progress was kept, and a backup copy was saved.`,
    };
  }
  return { state, persistent: true, notice: null };
}

export type SaveFailure = 'unavailable' | 'quota' | 'error';

export interface SaveResult {
  ok: boolean;
  reason?: SaveFailure;
  /** True when older sessions were dropped from the stored copy to make it fit. */
  trimmed?: boolean;
}

function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error) && !(typeof e === 'object' && e !== null)) return false;
  const err = e as { name?: string; code?: number };
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

export function saveState(state: AppState, storage: StorageLike | null = getStorage()): SaveResult {
  if (!storage) return { ok: false, reason: 'unavailable' };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (e) {
    if (!isQuotaError(e)) return { ok: false, reason: 'error' };
    // Storage is full: keep progress, drop the older half of the session history, and retry once.
    try {
      const trimmed = { ...state, sessions: state.sessions.slice(Math.floor(state.sessions.length / 2)) };
      storage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return { ok: true, trimmed: true };
    } catch {
      return { ok: false, reason: 'quota' };
    }
  }
}

export function clearStorage(storage: StorageLike | null = getStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
