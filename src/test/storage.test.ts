import { describe, expect, it } from 'vitest';
import { applyActivity } from '../lib/progression';
import { BACKUP_KEY, STORAGE_KEY, loadState, saveState } from '../lib/storage';
import { FakeStorage, makeSession, makeState } from './helpers';

describe('storage', () => {
  it('starts fresh and persistent when nothing is saved', () => {
    const r = loadState(new FakeStorage());
    expect(r.state.onboarded).toBe(false);
    expect(r.persistent).toBe(true);
    expect(r.notice).toBeNull();
  });

  it('round-trips state through serialization', () => {
    const storage = new FakeStorage();
    let state = makeState({ onboarded: true, startLevel: 'intermediate' });
    state = applyActivity(state, { session: makeSession({ id: 's1', keyErrors: { a: 2 }, keyTotals: { a: 9 } }) }).state;
    expect(saveState(state, storage).ok).toBe(true);
    const loaded = loadState(storage);
    expect(loaded.notice).toBeNull();
    expect(loaded.state).toEqual(state);
  });

  it('recovers from corrupted JSON and keeps a backup of the raw data', () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    const r = loadState(storage);
    expect(r.state.sessions).toEqual([]);
    expect(r.notice).toMatch(/backup/i);
    expect(storage.getItem(BACKUP_KEY)).toBe('{not json');
  });

  it('keeps valid sections when one field is malformed', () => {
    const storage = new FakeStorage();
    const good = applyActivity(makeState({ onboarded: true }), { session: makeSession({ id: 'keep' }) }).state;
    const raw = JSON.parse(JSON.stringify(good));
    raw.settings = 'oops';
    raw.streak = 42;
    storage.setItem(STORAGE_KEY, JSON.stringify(raw));
    const r = loadState(storage);
    expect(r.state.sessions).toHaveLength(1);
    expect(r.state.onboarded).toBe(true);
    expect(r.state.settings.theme).toBe('dark');
    expect(r.notice).toMatch(/invalid/i);
    expect(storage.getItem(BACKUP_KEY)).not.toBeNull();
  });

  it('drops only the invalid sessions', () => {
    const storage = new FakeStorage();
    const raw = JSON.parse(JSON.stringify(applyActivity(makeState(), { session: makeSession({ id: 'ok' }) }).state));
    raw.sessions.push({ id: 5 }, null, 'x');
    storage.setItem(STORAGE_KEY, JSON.stringify(raw));
    const r = loadState(storage);
    expect(r.state.sessions.map((s) => s.id)).toEqual(['ok']);
  });

  it('works in memory when storage is unavailable', () => {
    const r = loadState(null);
    expect(r.persistent).toBe(false);
    expect(r.notice).toMatch(/unavailable/i);
    expect(saveState(makeState(), null)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('never overwrites data from a newer app version', () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    const r = loadState(storage);
    expect(r.persistent).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toContain('99');
  });

  it('trims old sessions and retries when the quota is exceeded', () => {
    let state = makeState();
    for (let i = 0; i < 20; i++) state = applyActivity(state, { session: makeSession({ id: `q${i}`, startedAt: 1_700_000_000_000 + i }) }).state;
    const storage = new FakeStorage();
    storage.maxLength = JSON.stringify(state).length - 1;
    const r = saveState(state, storage);
    expect(r).toEqual({ ok: true, trimmed: true });
    expect(JSON.parse(storage.getItem(STORAGE_KEY) as string).sessions.length).toBe(10);
  });

  it('reports a quota failure when even the trimmed copy does not fit', () => {
    const storage = new FakeStorage();
    storage.maxLength = 10;
    expect(saveState(makeState(), storage)).toEqual({ ok: false, reason: 'quota' });
  });

  it('reports other write errors without throwing', () => {
    const storage = new FakeStorage();
    storage.failWith = new Error('blocked');
    expect(saveState(makeState(), storage)).toEqual({ ok: false, reason: 'error' });
  });
});
