import { wordsUsing } from '../data/words';
import { pick, shuffle, type Rng } from './rng';

/** A line of short letter groups built from `keys`, e.g. "fj jf ffj jjf". */
export function groupLine(keys: string[], rng: Rng, groups = 6, minLen = 2, maxLen = 4): string {
  if (keys.length === 0) return '';
  const parts: string[] = [];
  for (let g = 0; g < groups; g++) {
    const len = minLen + Math.floor(rng() * (maxLen - minLen + 1));
    let part = '';
    for (let i = 0; i < len; i++) part += pick(keys, rng);
    parts.push(part);
  }
  return parts.join(' ');
}

/** A line made of `count` words picked from `words`, avoiding immediate repeats. */
export function wordLine(words: string[], rng: Rng, count = 6): string {
  if (words.length === 0) return '';
  const out: string[] = [];
  let last = '';
  for (let i = 0; i < count; i++) {
    let w = pick(words, rng);
    if (words.length > 1 && w === last) w = pick(words, rng);
    out.push(w);
    last = w;
  }
  return out.join(' ');
}

/** Lines of real words that only use `allowed` letters, falling back to letter groups. */
export function wordsExercise(allowed: string, rng: Rng, { lines = 1, perLine = 6, min = 2, max = 7 } = {}): string {
  const words = wordsUsing(allowed, { min, max });
  const out: string[] = [];
  for (let i = 0; i < lines; i++) {
    out.push(words.length >= 6 ? wordLine(words, rng, perLine) : groupLine(allowed.split(''), rng, perLine));
  }
  return out.join(' ');
}

/** Words that contain at least one of `keys`, built from the full pool. */
export function wordsContaining(keys: string[], rng: Rng, count: number, min = 3, max = 9): string {
  const set = new Set(keys);
  const pool = wordsUsing('abcdefghijklmnopqrstuvwxyz', { min, max }).filter((w) => [...w].some((c) => set.has(c)));
  if (pool.length === 0) return groupLine(keys, rng, count);
  return shuffle(pool, rng).slice(0, count).join(' ');
}
