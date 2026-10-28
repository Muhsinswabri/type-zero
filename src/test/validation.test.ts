import { describe, expect, it } from 'vitest';
import { applyActivity } from '../lib/progression';
import { buildExport, sanitizeState, validateImport } from '../lib/validation';
import { makeSession, makeState } from './helpers';

function sample() {
  const state = applyActivity(makeState({ onboarded: true }), {
    session: makeSession({ id: 'one', type: 'lesson', refId: 'm1-keyboard' }),
    lesson: { id: 'm1-keyboard', passed: true, xp: 20 },
  }).state;
  return JSON.parse(JSON.stringify(buildExport(state)));
}

describe('import validation', () => {
  it('accepts a valid export and restores its content', () => {
    const file = sample();
    const r = validateImport(file);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.sessions).toHaveLength(1);
      expect(r.state.lessons['m1-keyboard'].completed).toBe(true);
      expect(r.state.xp.total).toBe(file.xp.total);
      expect(r.state.achievements['first-steps']).toBeDefined();
    }
  });

  it('includes the documented sections in an export', () => {
    const file = sample();
    for (const key of ['schemaVersion', 'exportedAt', 'settings', 'lessons', 'sessions', 'xp', 'achievements', 'daily']) {
      expect(file).toHaveProperty(key);
    }
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'hello'],
    ['an object from another app', { app: 'other', schemaVersion: 1 }],
  ])('rejects %s', (_name, value) => {
    expect(validateImport(value).ok).toBe(false);
  });

  it('rejects a missing or invalid schema version', () => {
    const f = sample();
    delete f.schemaVersion;
    expect(validateImport(f).ok).toBe(false);
    expect(validateImport({ ...sample(), schemaVersion: 'one' }).ok).toBe(false);
  });

  it('rejects files from a newer schema', () => {
    const r = validateImport({ ...sample(), schemaVersion: 2 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/newer/);
  });

  it.each(['settings', 'lessons', 'sessions', 'xp', 'achievements', 'daily'])('rejects a file missing "%s"', (field) => {
    const f = sample();
    delete f[field];
    const r = validateImport(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(field);
  });

  it('rejects a file whose sessions are all invalid', () => {
    const f = sample();
    f.sessions = [{ nope: true }, 3];
    expect(validateImport(f).ok).toBe(false);
  });

  it('drops invalid sessions but keeps the rest, and reports the issue', () => {
    const f = sample();
    f.sessions.push({ id: 'bad' });
    const r = validateImport(f);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.sessions).toHaveLength(1);
      expect(r.issues.length).toBeGreaterThan(0);
    }
  });

  it('clamps out-of-range values and ignores prototype-pollution keys', () => {
    const f = JSON.parse(
      JSON.stringify(sample()).replace('"theme":"dark"', '"theme":"neon"').replace('"lessons":{', '"lessons":{"__proto__":{"completed":true},'),
    );
    f.sessions[0].accuracy = 900;
    const r = validateImport(f);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.settings.theme).toBe('dark');
      expect(r.state.sessions[0].accuracy).toBe(100);
      expect(Object.keys(r.state.lessons)).not.toContain('__proto__');
      expect(({} as Record<string, unknown>).completed).toBeUndefined();
    }
  });

  it('does not treat file content as code', () => {
    const f = sample();
    f.sessions[0].label = '<img src=x onerror=alert(1)>';
    const r = validateImport(f);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.sessions[0].label).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('sanitizeState', () => {
  it('returns defaults for garbage input', () => {
    expect(sanitizeState(42).state.sessions).toEqual([]);
    expect(sanitizeState(undefined).issues).toContain('saved data');
  });
  it('rebuilds lifetime stats from sessions when they are missing', () => {
    const f = sample();
    delete f.stats;
    const { state } = sanitizeState(f);
    expect(state.stats.totalSessions).toBe(1);
  });
});
