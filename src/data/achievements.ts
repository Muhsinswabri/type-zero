import {
  Award,
  BookOpen,
  CalendarCheck,
  Crown,
  Flame,
  Footprints,
  Gauge,
  GraduationCap,
  Hourglass,
  Medal,
  Rocket,
  Sparkles,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { ALL_LESSONS, MODULE_BY_ID } from './curriculum';
import { levelFromXp } from '../lib/levels';
import type { AppState } from '../types';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  xp: number;
  /** Current and target values, used both for the unlock check and the progress bar. */
  progress: (state: AppState) => { value: number; target: number };
}

const lessonsDone = (s: AppState) => ALL_LESSONS.filter((l) => s.lessons[l.id]?.completed).length;

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first lesson.',
    icon: Footprints,
    xp: 20,
    progress: (s) => ({ value: lessonsDone(s), target: 1 }),
  },
  {
    id: 'getting-comfortable',
    name: 'Getting Comfortable',
    description: 'Complete five lessons.',
    icon: BookOpen,
    xp: 30,
    progress: (s) => ({ value: lessonsDone(s), target: 5 }),
  },
  {
    id: 'home-row-hero',
    name: 'Home Row Hero',
    description: 'Complete every lesson in Home Row Fundamentals.',
    icon: Award,
    xp: 50,
    progress: (s) => {
      const lessons = MODULE_BY_ID['m2'].lessons;
      return { value: lessons.filter((l) => s.lessons[l.id]?.completed).length, target: lessons.length };
    },
  },
  {
    id: 'accuracy-first',
    name: 'Accuracy First',
    description: 'Reach 95% accuracy in a session of at least 20 keystrokes.',
    icon: Target,
    xp: 30,
    progress: (s) => ({ value: s.stats.bestAccuracy, target: 95 }),
  },
  {
    id: 'perfect-session',
    name: 'Perfect Session',
    description: 'Finish a session of at least 20 keystrokes with 100% accuracy.',
    icon: Sparkles,
    xp: 40,
    progress: (s) => ({ value: Math.min(1, s.stats.perfectSessions), target: 1 }),
  },
  {
    id: 'speed-starter',
    name: 'Speed Starter',
    description: 'Reach 20 WPM.',
    icon: Gauge,
    xp: 30,
    progress: (s) => ({ value: s.stats.bestWpm, target: 20 }),
  },
  {
    id: 'speed-builder',
    name: 'Speed Builder',
    description: 'Reach 40 WPM.',
    icon: Zap,
    xp: 60,
    progress: (s) => ({ value: s.stats.bestWpm, target: 40 }),
  },
  {
    id: 'fast-fingers',
    name: 'Fast Fingers',
    description: 'Reach 60 WPM.',
    icon: Rocket,
    xp: 100,
    progress: (s) => ({ value: s.stats.bestWpm, target: 60 }),
  },
  {
    id: 'consistent-learner',
    name: 'Consistent Learner',
    description: 'Practice on seven consecutive days.',
    icon: Flame,
    xp: 75,
    progress: (s) => ({ value: s.streak.longest, target: 7 }),
  },
  {
    id: 'test-taker',
    name: 'Test Taker',
    description: 'Complete your first speed test.',
    icon: Medal,
    xp: 15,
    progress: (s) => ({ value: s.stats.testSessions, target: 1 }),
  },
  {
    id: 'practice-champion',
    name: 'Practice Champion',
    description: 'Complete 50 practice sessions.',
    icon: Trophy,
    xp: 100,
    progress: (s) => ({ value: s.stats.practiceSessions, target: 50 }),
  },
  {
    id: 'time-well-spent',
    name: 'Time Well Spent',
    description: 'Accumulate one hour of typing time.',
    icon: Hourglass,
    xp: 50,
    progress: (s) => ({ value: s.stats.totalDurationMs / 60_000, target: 60 }),
  },
  {
    id: 'curriculum-graduate',
    name: 'Curriculum Graduate',
    description: 'Complete every lesson in the curriculum.',
    icon: GraduationCap,
    xp: 200,
    progress: (s) => ({ value: lessonsDone(s), target: ALL_LESSONS.length }),
  },
  {
    id: 'type-zero-hero',
    name: 'TypeZero Hero',
    description: 'Reach level 10.',
    icon: Crown,
    xp: 0,
    progress: (s) => ({ value: Math.min(10, levelFromXp(s.xp.total)), target: 10 }),
  },
  {
    id: 'daily-doer',
    name: 'Daily Doer',
    description: 'Complete a daily challenge.',
    icon: CalendarCheck,
    xp: 20,
    progress: (s) => ({ value: Math.min(1, Object.keys(s.challenges).length), target: 1 }),
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export function isAchieved(a: Achievement, state: AppState): boolean {
  const { value, target } = a.progress(state);
  return value >= target;
}
