import { describe, expect, it } from 'vitest';
import { accuracy, buildMetrics, commonErrors, grossWpm, netWpm, weakKeys } from '../lib/typingMetrics';

describe('gross WPM = (typed / 5) / minutes', () => {
  it('computes 50 characters in one minute as 10 WPM', () => {
    expect(grossWpm(50, 60_000)).toBeCloseTo(10);
  });
  it('scales with time', () => {
    expect(grossWpm(50, 30_000)).toBeCloseTo(20);
  });
  it('is 0 when nothing was typed', () => {
    expect(grossWpm(0, 60_000)).toBe(0);
  });
  it('floors very short elapsed times at one second instead of dividing by ~zero', () => {
    const v = grossWpm(5, 0);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeCloseTo(60);
    expect(grossWpm(5, 1)).toBeCloseTo(60);
  });
});

describe('net WPM = max(0, (typed / 5 - uncorrected) / minutes)', () => {
  it('subtracts uncorrected errors per minute', () => {
    expect(netWpm(50, 2, 60_000)).toBeCloseTo(8);
  });
  it('equals gross when there are no uncorrected errors', () => {
    expect(netWpm(100, 0, 60_000)).toBeCloseTo(grossWpm(100, 60_000));
  });
  it('never goes below zero', () => {
    expect(netWpm(10, 50, 60_000)).toBe(0);
  });
  it('handles empty input', () => {
    expect(netWpm(0, 0, 0)).toBe(0);
  });
});

describe('accuracy = correct / typed * 100', () => {
  it('computes a percentage', () => {
    expect(accuracy(9, 10)).toBe(90);
  });
  it('reports 100 for empty input', () => {
    expect(accuracy(0, 0)).toBe(100);
  });
  it('never exceeds 100 or drops below 0', () => {
    expect(accuracy(12, 10)).toBe(100);
    expect(accuracy(-3, 10)).toBe(0);
  });
});

describe('buildMetrics', () => {
  it('derives incorrect from typed minus correct', () => {
    const m = buildMetrics(50, 45, 1, 60_000);
    expect(m.incorrect).toBe(5);
    expect(m.accuracy).toBe(90);
    expect(m.netWpm).toBeCloseTo(9);
    expect(m.grossWpm).toBeCloseTo(10);
  });
});

describe('weak keys', () => {
  it('ranks by error rate and ignores keys with too few attempts', () => {
    const errors = { a: 5, b: 1, c: 2, ' ': 9 };
    const totals = { a: 10, b: 100, c: 2, ' ': 10 };
    expect(weakKeys(errors, totals, { minAttempts: 5 }).map((k) => k.key)).toEqual(['a', 'b']);
  });
  it('lists the most common errors by count', () => {
    expect(commonErrors({ a: 2, b: 9, ' ': 50 }).map((e) => e.key)).toEqual(['b', 'a']);
  });
});
