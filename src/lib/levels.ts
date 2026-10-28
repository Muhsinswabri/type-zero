import { LEVEL_TITLES, XP_PER_LEVEL_STEP } from '../data/rewards';

/** Cumulative XP required to reach `level`: 50 * (level - 1) * level. Level 1 starts at 0 XP. */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return XP_PER_LEVEL_STEP * (l - 1) * l;
}

export function levelFromXp(xp: number): number {
  const safe = Math.max(0, Number.isFinite(xp) ? xp : 0);
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * safe) / XP_PER_LEVEL_STEP)) / 2));
  while (xpForLevel(level + 1) <= safe) level++;
  while (level > 1 && xpForLevel(level) > safe) level--;
  return level;
}

export function titleForLevel(level: number): string {
  let title = LEVEL_TITLES[0].title;
  for (const t of LEVEL_TITLES) if (level >= t.from) title = t.title;
  return title;
}

export interface LevelInfo {
  level: number;
  title: string;
  totalXp: number;
  /** XP earned since the start of this level. */
  xpIntoLevel: number;
  /** XP span of this level (distance to the next level). */
  xpSpan: number;
  xpToNext: number;
  /** 0..1 progress through the current level. */
  progress: number;
}

export function levelInfo(xp: number): LevelInfo {
  const totalXp = Math.max(0, Math.floor(xp));
  const level = levelFromXp(totalXp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const xpIntoLevel = totalXp - start;
  const xpSpan = next - start;
  return {
    level,
    title: titleForLevel(level),
    totalXp,
    xpIntoLevel,
    xpSpan,
    xpToNext: next - totalXp,
    progress: xpSpan > 0 ? xpIntoLevel / xpSpan : 0,
  };
}
