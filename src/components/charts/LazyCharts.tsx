import { lazy, Suspense } from 'react';
import type { ActivityPoint, DayPoint } from '../../lib/analytics';

const Trend = lazy(() => import('./Charts').then((m) => ({ default: m.TrendChart })));
const Activity = lazy(() => import('./Charts').then((m) => ({ default: m.ActivityChart })));

const fallback = <div className="h-52 animate-pulse rounded-xl bg-surface" aria-hidden="true" />;

export function LazyTrendChart(props: { data: DayPoint[]; metric: 'wpm' | 'accuracy'; title: string }) {
  return (
    <Suspense fallback={fallback}>
      <Trend {...props} />
    </Suspense>
  );
}

export function LazyActivityChart(props: { data: ActivityPoint[]; title: string }) {
  return (
    <Suspense fallback={fallback}>
      <Activity {...props} />
    </Suspense>
  );
}
