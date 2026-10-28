import { describe, expect, it } from 'vitest';
import { ALL_LESSONS, CURRICULUM, START_LESSON } from '../data/curriculum';
import { CHALLENGES, challengeForDate } from '../data/challenges';
import { lookupChar } from '../lib/fingerMapping';
import { formatClock, formatDuration } from '../lib/dates';
import { buildPracticeText, buildTestText } from '../lib/textGen';
import { PASSAGE_CATEGORIES } from '../data/passages';

describe('curriculum data', () => {
  it('has the nine modules from the spec in order', () => {
    expect(CURRICULUM.map((m) => m.title)).toEqual([
      'Meet Your Keyboard',
      'Home Row Fundamentals',
      'Top Row',
      'Bottom Row',
      'Complete Alphabet',
      'Punctuation and Numbers',
      'Accuracy Training',
      'Speed Development',
      'Real-World Typing',
    ]);
  });

  it('has unique lesson ids and real content for every lesson', () => {
    expect(new Set(ALL_LESSONS.map((l) => l.id)).size).toBe(ALL_LESSONS.length);
    for (const l of ALL_LESSONS) {
      expect(l.title.length, l.id).toBeGreaterThan(3);
      expect(l.description.length, l.id).toBeGreaterThan(10);
      expect(l.objective.length, l.id).toBeGreaterThan(10);
      expect(l.instructions.length, l.id).toBeGreaterThan(0);
      expect(l.exercises.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.durationMin, l.id).toBeGreaterThan(0);
      expect(l.xp, l.id).toBeGreaterThan(0);
      expect(l.minAccuracy, l.id).toBeGreaterThanOrEqual(80);
      for (const e of l.exercises) expect(e.text.trim().length, l.id).toBeGreaterThanOrEqual(8);
    }
  });

  it('has the starting lessons the onboarding points at', () => {
    for (const id of Object.values(START_LESSON)) expect(ALL_LESSONS.some((l) => l.id === id)).toBe(true);
  });

  it('only asks learners to type characters that exist on the keyboard', () => {
    for (const l of ALL_LESSONS) {
      for (const e of l.exercises) {
        for (const ch of e.text) expect(lookupChar('qwerty', ch), `${l.id}: "${ch}"`).not.toBeNull();
      }
    }
  });

  it('never uses a key before the curriculum has introduced it (modules 1 to 6)', () => {
    const early = ALL_LESSONS.filter((l) => ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].includes(l.moduleId));
    for (const l of early) {
      const allowed = new Set(l.allowed);
      for (const e of l.exercises) {
        for (const ch of e.text) expect(allowed.has(ch), `${l.id}: "${ch}" in "${e.text}"`).toBe(true);
      }
    }
  });

  it('has clean exercise text with no stray whitespace', () => {
    for (const l of ALL_LESSONS) {
      for (const e of l.exercises) {
        expect(e.text, l.id).toBe(e.text.trim());
        expect(e.text.includes('  '), `${l.id}: "${e.text}"`).toBe(false);
      }
    }
  });
});

describe('text generation', () => {
  it('builds enough text for every passage category and duration', () => {
    for (const c of PASSAGE_CATEGORIES.filter((x) => x.id !== 'custom')) {
      for (const d of [15, 30, 60, 120]) {
        const text = buildTestText(c.id, d);
        expect(text.length, `${c.id} ${d}`).toBeGreaterThanOrEqual(d * 12);
        for (const ch of text) expect(lookupChar('qwerty', ch), `${c.id}: "${ch}"`).not.toBeNull();
      }
    }
  });

  it('falls back to a home-row warm-up when there is no weak-key history', () => {
    const r = buildPracticeText({ mode: 'weak', keys: [], rows: [], difficulty: 'medium', seconds: 60, custom: '' }, []);
    expect(r.note).toMatch(/home-row/);
    expect(r.text.length).toBeGreaterThan(100);
  });

  it('focuses weak-key practice on the given keys', () => {
    const r = buildPracticeText({ mode: 'weak', keys: [], rows: [], difficulty: 'medium', seconds: 60, custom: '' }, ['q', 'z']);
    expect(r.text).toMatch(/[qz]/);
  });

  it('normalises custom text', () => {
    const r = buildPracticeText({ mode: 'custom', keys: [], rows: [], difficulty: 'easy', seconds: 60, custom: 'It’s   a\n\ttest “quote” é' }, []);
    expect(r.text).toBe('It\'s a test "quote"');
  });
});

describe('daily challenges', () => {
  it('picks the same challenge for the same date and varies across dates', () => {
    expect(challengeForDate('2025-06-01')).toBe(challengeForDate('2025-06-01'));
    const ids = new Set(Array.from({ length: 60 }, (_, i) => challengeForDate(`2025-07-${String((i % 28) + 1).padStart(2, '0')}`).id));
    expect(ids.size).toBeGreaterThan(1);
    expect(CHALLENGES.length).toBeGreaterThan(3);
  });
});

describe('formatting', () => {
  it('formats clocks and durations', () => {
    expect(formatClock(61_000)).toBe('1:01');
    expect(formatClock(0)).toBe('0:00');
    expect(formatDuration(45_000)).toBe('45s');
    expect(formatDuration(3_900_000)).toBe('1h 5m');
  });
});
