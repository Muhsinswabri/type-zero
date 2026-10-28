import { LAYOUTS, type KeyDef } from '../data/keyboard';
import type { FingerId, LayoutId } from '../types';

export interface KeyLookup {
  key: KeyDef;
  /** True when the character needs Shift held. */
  shift: boolean;
}

const cache = new Map<LayoutId, Map<string, KeyLookup>>();

function table(layoutId: LayoutId): Map<string, KeyLookup> {
  let t = cache.get(layoutId);
  if (t) return t;
  t = new Map();
  for (const row of LAYOUTS[layoutId].rows) {
    for (const key of row) {
      if (key.id === 'Space') t.set(' ', { key, shift: false });
      if (key.base !== undefined) t.set(key.base, { key, shift: false });
    }
  }
  for (const row of LAYOUTS[layoutId].rows) {
    for (const key of row) {
      if (key.shift !== undefined && !t.has(key.shift)) t.set(key.shift, { key, shift: true });
    }
  }
  cache.set(layoutId, t);
  return t;
}

/** Finds the physical key (and Shift requirement) that produces `ch`. */
export function lookupChar(layoutId: LayoutId, ch: string): KeyLookup | null {
  return table(layoutId).get(ch) ?? null;
}

export function handOf(finger: FingerId): 'left' | 'right' {
  return finger.startsWith('l') ? 'left' : 'right';
}

/** Standard touch-typing finger(s) for a character. Space uses either thumb. */
export function fingersFor(layoutId: LayoutId, ch: string): FingerId[] {
  const hit = lookupChar(layoutId, ch);
  if (!hit) return [];
  return hit.key.id === 'Space' ? ['lt', 'rt'] : [hit.key.finger];
}

/** The Shift key to use: the one on the opposite hand to the character's finger. */
export function shiftKeyFor(layoutId: LayoutId, ch: string): 'ShiftLeft' | 'ShiftRight' | null {
  const hit = lookupChar(layoutId, ch);
  if (!hit || !hit.shift) return null;
  return handOf(hit.key.finger) === 'left' ? 'ShiftRight' : 'ShiftLeft';
}

/** Maps a physical key event to a virtual keyboard key id. */
export function keyIdFromEvent(layoutId: LayoutId, e: { key: string; code?: string }): string | null {
  if (e.key === 'Shift') return e.code === 'ShiftRight' ? 'ShiftRight' : 'ShiftLeft';
  if (e.key === 'Backspace' || e.key === 'Tab' || e.key === 'CapsLock' || e.key === 'Enter') return e.key;
  if (e.key === ' ') return 'Space';
  const hit = lookupChar(layoutId, e.key);
  return hit ? hit.key.id : null;
}
