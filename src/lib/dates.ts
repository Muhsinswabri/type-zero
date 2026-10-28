const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD. All streak and daily logic uses these keys. */
export function toDateKey(input: Date | number = new Date()): string {
  const d = typeof input === 'number' ? new Date(input) : input;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateKey(key: string): { y: number; m: number; d: number } | null {
  const match = KEY_RE.exec(key);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return { y, m, d };
}

export const isDateKey = (value: unknown): value is string =>
  typeof value === 'string' && parseDateKey(value) !== null;

function utcDay(key: string): number {
  const p = parseDateKey(key);
  return p ? Date.UTC(p.y, p.m - 1, p.d) / 86_400_000 : NaN;
}

/** Whole calendar days from `from` to `to` (DST-safe because it works in UTC). */
export function daysBetween(from: string, to: string): number {
  return Math.round(utcDay(to) - utcDay(from));
}

export function addDays(key: string, n: number): string {
  const p = parseDateKey(key);
  if (!p) return key;
  const t = new Date(Date.UTC(p.y, p.m - 1, p.d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** The last `n` date keys ending at `today`, oldest first. */
export function lastNDays(n: number, today: string = toDateKey()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(today, -i));
  return out;
}

export function formatShortDate(key: string): string {
  const p = parseDateKey(key);
  if (!p) return key;
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return s > 0 && m < 10 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

export function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${pad(s)}`;
}
