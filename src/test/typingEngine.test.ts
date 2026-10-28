import { describe, expect, it } from 'vitest';
import {
  backspace,
  createEngine,
  elapsedOf,
  finish,
  isComplete,
  metricsOf,
  typeChar,
  uncorrectedErrors,
  type EngineOptions,
  type EngineState,
} from '../lib/typingEngine';

const OPTS: EngineOptions = { allowBackspace: true, stopOnError: false, limitMs: null };

function run(target: string, keys: string, opts: EngineOptions = OPTS, step = 100): EngineState {
  let s = createEngine(target, opts);
  let now = 1000;
  for (const k of keys) {
    s = k === '<' ? backspace(s) : typeChar(s, k, now, 5000);
    now += step;
  }
  return s;
}

describe('typing engine', () => {
  it('starts idle with no timer and zero metrics', () => {
    const s = createEngine('abc');
    expect(s.status).toBe('idle');
    expect(s.startedAt).toBeNull();
    expect(elapsedOf(s, 99_999)).toBe(0);
    expect(metricsOf(s, 99_999)).toMatchObject({ typed: 0, grossWpm: 0, netWpm: 0, accuracy: 100 });
  });

  it('starts the timer only on the first keystroke', () => {
    const s = typeChar(createEngine('abc'), 'a', 4200, 777);
    expect(s.status).toBe('running');
    expect(s.startedAt).toBe(4200);
    expect(s.wallStart).toBe(777);
  });

  it('handles a single character', () => {
    const s = run('a', 'a');
    expect(s.status).toBe('finished');
    expect(isComplete(s)).toBe(true);
    expect(s.correct).toBe(1);
  });

  it('flags incorrect characters and tracks them per expected key', () => {
    const s = run('cat', 'cxt');
    expect(s.input).toBe('cxt');
    expect(s.correct).toBe(2);
    expect(s.incorrect).toBe(1);
    expect(uncorrectedErrors(s)).toBe(1);
    expect(s.keyErrors).toEqual({ a: 1 });
    expect(s.keyTotals).toEqual({ c: 1, a: 1, t: 1 });
  });

  it('counts a corrected mistake against accuracy but not against net speed', () => {
    const s = run('cat', 'cx<at');
    expect(s.input).toBe('cat');
    expect(s.typed).toBe(4);
    expect(s.correct).toBe(3);
    expect(s.incorrect).toBe(1);
    expect(uncorrectedErrors(s)).toBe(0);
    expect(s.backspaces).toBe(1);
    const m = metricsOf(s, s.endedAt as number);
    expect(m.accuracy).toBe(75);
    expect(m.netWpm).toBeCloseTo(m.grossWpm);
  });

  it('backspace does nothing on empty input or before starting', () => {
    const idle = createEngine('abc');
    expect(backspace(idle)).toBe(idle);
    const s = run('abc', 'a<<');
    expect(s.input).toBe('');
    expect(s.backspaces).toBe(1);
  });

  it('ignores backspace when it is disabled', () => {
    const s = run('abc', 'ax<', { ...OPTS, allowBackspace: false });
    expect(s.input).toBe('ax');
    expect(s.backspaces).toBe(0);
  });

  it('holds the cursor on a wrong key in stop-on-error mode', () => {
    const s = run('ab', 'xab', { ...OPTS, stopOnError: true });
    expect(s.input).toBe('ab');
    expect(s.incorrect).toBe(1);
    expect(s.typed).toBe(3);
    expect(uncorrectedErrors(s)).toBe(0);
  });

  it('distinguishes capital letters', () => {
    const s = run('Ab', 'ab');
    expect(s.incorrect).toBe(1);
    expect(s.keyErrors).toEqual({ a: 1 });
    expect(run('Ab', 'Ab').incorrect).toBe(0);
  });

  it('handles spaces and punctuation', () => {
    const s = run('Hi, you.', 'Hi, you.');
    expect(s.status).toBe('finished');
    expect(s.correct).toBe(8);
    const wrongSpace = run('a b', 'axb');
    expect(wrongSpace.keyErrors).toEqual({ ' ': 1 });
  });

  it('counts repeated keystrokes once each', () => {
    const s = run('aaaa', 'aaaa');
    expect(s.typed).toBe(4);
    expect(s.correct).toBe(4);
  });

  it('ignores non-printable and multi-character input', () => {
    const s = createEngine('abc');
    expect(typeChar(s, 'Shift', 1)).toBe(s);
    expect(typeChar(s, '\n', 1)).toBe(s);
    expect(typeChar(s, 'ab', 1)).toBe(s);
  });

  it('finishes when the target is fully typed and ignores later keys', () => {
    const s = run('ab', 'ab');
    expect(s.status).toBe('finished');
    expect(typeChar(s, 'c', 99_999)).toBe(s);
  });

  it('does not count keystrokes that arrive after the time limit', () => {
    const limited: EngineOptions = { ...OPTS, limitMs: 1000 };
    let s = typeChar(createEngine('abcdef', limited), 'a', 0);
    s = typeChar(s, 'b', 500);
    s = typeChar(s, 'c', 1200);
    expect(s.status).toBe('finished');
    expect(s.typed).toBe(2);
    expect(elapsedOf(s, 5000)).toBe(1000);
  });

  it('finish() ends a running session at the limit, not at the late tick', () => {
    const limited: EngineOptions = { ...OPTS, limitMs: 1000 };
    const s = finish(typeChar(createEngine('abcdef', limited), 'a', 0), 1300);
    expect(s.status).toBe('finished');
    expect(s.endedAt).toBe(1000);
    expect(finish(createEngine('abc'), 10).status).toBe('idle');
  });

  it('computes speed from timestamps', () => {
    // 10 characters over 6 seconds => (10 / 5) / 0.1 min = 20 WPM
    let s = createEngine('abcdefghij');
    for (let i = 0; i < 10; i++) s = typeChar(s, 'abcdefghij'[i], 1000 + i * (6000 / 9));
    expect(metricsOf(s, s.endedAt as number).grossWpm).toBeCloseTo(20, 0);
  });

  it('keeps an interrupted (reset) session out of the previous run', () => {
    const running = run('abc', 'a');
    const fresh = createEngine(running.target, running.opts);
    expect(fresh.status).toBe('idle');
    expect(fresh.typed).toBe(0);
  });
});
