import { hashSeed } from '../lib/rng';
import type { DailyActivity } from '../types';

export type ChallengeKind = 'minutes' | 'lessons' | 'accuracy' | 'wpm' | 'sessions';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  kind: ChallengeKind;
  target: number;
  unit: string;
}

export const CHALLENGES: Challenge[] = [
  { id: 'minutes-5', title: 'Five-minute focus', description: 'Type for five minutes today.', kind: 'minutes', target: 5, unit: 'min' },
  { id: 'minutes-10', title: 'Ten-minute stretch', description: 'Type for ten minutes today.', kind: 'minutes', target: 10, unit: 'min' },
  { id: 'lesson-1', title: 'One lesson', description: 'Pass a lesson today.', kind: 'lessons', target: 1, unit: 'lesson' },
  { id: 'accuracy-95', title: 'Clean hands', description: 'Finish a session with 95% accuracy.', kind: 'accuracy', target: 95, unit: '%' },
  { id: 'wpm-20', title: 'Warm-up speed', description: 'Reach 20 WPM in a session.', kind: 'wpm', target: 20, unit: 'WPM' },
  { id: 'wpm-30', title: 'Pick up the pace', description: 'Reach 30 WPM in a session.', kind: 'wpm', target: 30, unit: 'WPM' },
  { id: 'sessions-3', title: 'Three sessions', description: 'Complete three practice sessions today.', kind: 'sessions', target: 3, unit: 'sessions' },
];

/** The same date always gives the same challenge. */
export function challengeForDate(dateKey: string): Challenge {
  return CHALLENGES[hashSeed(`typezero:${dateKey}`) % CHALLENGES.length];
}

export interface ChallengeProgress {
  value: number;
  target: number;
  done: boolean;
}

export function challengeProgress(challenge: Challenge, daily: DailyActivity | undefined): ChallengeProgress {
  const { target } = challenge;
  let value = 0;
  if (daily) {
    switch (challenge.kind) {
      case 'minutes':
        value = daily.durationMs / 60_000;
        break;
      case 'lessons':
        value = daily.lessons;
        break;
      case 'accuracy':
        value = daily.bestAccuracy;
        break;
      case 'wpm':
        value = daily.bestWpm;
        break;
      case 'sessions':
        value = daily.sessions;
        break;
    }
  }
  value = Math.min(value, target);
  return { value, target, done: value >= target };
}
