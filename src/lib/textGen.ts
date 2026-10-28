import {
  ADVANCED_VOCABULARY,
  EASY_SENTENCES,
  GENERAL_ENGLISH,
  normalizeCustomText,
  PROGRAMMING,
  PUNCTUATION_DRILLS,
  type PassageCategoryId,
} from '../data/passages';
import { ROW_KEYS } from '../data/keyboard';
import { COMMON_WORDS, WORD_POOL, wordsUsing } from '../data/words';
import type { TypingDifficulty } from '../types';
import { groupLine, wordLine, wordsContaining } from './drills';
import { shuffle, type Rng } from './rng';

/** Enough text that a ~150 WPM typist cannot run out before the timer does. */
export function targetLength(seconds: number): number {
  return Math.ceil(seconds * 12.5);
}

function fill(chunks: () => string, minLength: number): string {
  const parts: string[] = [];
  let length = 0;
  let guard = 0;
  while (length < minLength && guard++ < 500) {
    const part = chunks();
    if (!part) break;
    parts.push(part);
    length += part.length + 1;
  }
  return parts.join(' ');
}

function cycle(items: string[], rng: Rng): () => string {
  let queue: string[] = [];
  return () => {
    if (queue.length === 0) queue = shuffle(items, rng);
    return queue.shift() as string;
  };
}

const sentencesOf = (paragraphs: string[]): string[] =>
  paragraphs.flatMap((p) => p.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? []);

export function buildTestText(category: PassageCategoryId, seconds: number, rng: Rng = Math.random, custom = ''): string {
  const min = targetLength(seconds);
  switch (category) {
    case 'common-words':
      return fill(() => wordLine(COMMON_WORDS, rng, 8), min);
    case 'easy-sentences':
      return fill(cycle(EASY_SENTENCES, rng), min);
    case 'general-english':
      return fill(cycle(GENERAL_ENGLISH, rng), min);
    case 'advanced-vocabulary':
      return fill(cycle(ADVANCED_VOCABULARY, rng), min);
    case 'programming':
      return fill(cycle(PROGRAMMING, rng), min);
    case 'custom':
      return normalizeCustomText(custom);
  }
}

export type PracticeMode = 'keys' | 'rows' | 'words' | 'sentences' | 'punctuation' | 'weak' | 'custom' | 'free';
export type RowId = 'number' | 'top' | 'home' | 'bottom';

export interface PracticeConfig {
  mode: PracticeMode;
  keys: string[];
  rows: RowId[];
  difficulty: TypingDifficulty;
  seconds: number;
  custom: string;
}

export interface PracticeText {
  text: string;
  /** Explains a fallback, such as not enough history for weak-key practice. */
  note?: string;
}

const WORD_LENGTHS: Record<TypingDifficulty, [number, number]> = { easy: [2, 4], medium: [4, 6], hard: [6, 12] };
const GROUP_LENGTHS: Record<TypingDifficulty, [number, number]> = { easy: [2, 3], medium: [2, 4], hard: [3, 6] };

function keyDrill(keys: string[], difficulty: TypingDifficulty, rng: Rng, min: number): string {
  const letters = keys.filter((k) => k >= 'a' && k <= 'z').join('');
  const [gMin, gMax] = GROUP_LENGTHS[difficulty];
  const pool = letters.length >= 2 ? wordsUsing(letters, { min: 2, max: 9 }) : [];
  let toggle = 0;
  return fill(() => {
    toggle++;
    if (pool.length >= 6 && toggle % 2 === 0) return wordLine(pool, rng, 5);
    return groupLine(keys, rng, 6, gMin, gMax);
  }, min);
}

export function buildPracticeText(
  cfg: PracticeConfig,
  weak: string[],
  rng: Rng = Math.random,
): PracticeText {
  const min = targetLength(cfg.seconds);
  const homeRow = [...ROW_KEYS.home];

  switch (cfg.mode) {
    case 'keys': {
      if (cfg.keys.length === 0) {
        return { text: keyDrill(homeRow, cfg.difficulty, rng, min), note: 'No keys selected, so the home row is used.' };
      }
      return { text: keyDrill(cfg.keys, cfg.difficulty, rng, min) };
    }
    case 'rows': {
      const keys = cfg.rows.flatMap((r) => [...ROW_KEYS[r]]);
      if (keys.length === 0) return { text: keyDrill(homeRow, cfg.difficulty, rng, min), note: 'No row selected, so the home row is used.' };
      return { text: keyDrill(keys, cfg.difficulty, rng, min) };
    }
    case 'words': {
      const [a, b] = WORD_LENGTHS[cfg.difficulty];
      const pool = WORD_POOL.filter((w) => w.length >= a && w.length <= b);
      return { text: fill(() => wordLine(pool, rng, 8), min) };
    }
    case 'sentences': {
      const source =
        cfg.difficulty === 'easy'
          ? EASY_SENTENCES
          : cfg.difficulty === 'medium'
            ? [...EASY_SENTENCES, ...sentencesOf(GENERAL_ENGLISH)]
            : sentencesOf(ADVANCED_VOCABULARY);
      return { text: fill(cycle(source, rng), min) };
    }
    case 'punctuation':
      return { text: fill(cycle(PUNCTUATION_DRILLS, rng), min) };
    case 'weak': {
      if (weak.length === 0) {
        return {
          text: keyDrill(homeRow, cfg.difficulty, rng, min),
          note: 'Not enough typing history to find your weak keys yet, so this is a home-row warm-up.',
        };
      }
      let toggle = 0;
      const text = fill(() => {
        toggle++;
        return toggle % 2 === 0 ? groupLine(weak, rng, 6, 2, 4) : wordsContaining(weak, rng, 5);
      }, min);
      return { text, note: `Focusing on: ${weak.join(' ')}` };
    }
    case 'custom':
      return { text: normalizeCustomText(cfg.custom) };
    case 'free':
      return { text: '' };
  }
}
