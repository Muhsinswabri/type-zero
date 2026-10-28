import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Gauge, GraduationCap, LineChart, ListChecks, Target, Trophy } from 'lucide-react';
import { LazyActivityChart, LazyTrendChart } from '../components/charts/LazyCharts';
import { EmptyState, PageHeader, ProgressBar, Segmented, StatCard } from '../components/ui/ui';
import { CURRICULUM } from '../data/curriculum';
import { useProgress } from '../hooks/useProgress';
import { RANGES, activityPoints, dayPoints, sessionsInRange, sumKeyCounts, summarize, type RangeId } from '../lib/analytics';
import { formatDuration, formatShortDate, toDateKey } from '../lib/dates';
import { curriculumProgress, moduleProgress } from '../lib/progression';
import { commonErrors, weakKeys } from '../lib/typingMetrics';

const keyLabel = (k: string) => (k === ' ' ? 'Space' : k.toUpperCase());

export default function ProgressPage() {
  const { state } = useProgress();
  const [range, setRange] = useState<RangeId>('30d');
  const today = toDateKey();

  const sessions = useMemo(() => sessionsInRange(state.sessions, range, today), [state.sessions, range, today]);
  const summary = useMemo(() => summarize(sessions), [sessions]);
  const points = useMemo(() => dayPoints(sessions), [sessions]);
  const activity = useMemo(() => activityPoints(state.daily, range, today), [state.daily, range, today]);
  const counts = useMemo(
    () => (range === 'all' ? { keyErrors: state.stats.keyErrors, keyTotals: state.stats.keyTotals } : sumKeyCounts(sessions)),
    [range, sessions, state.stats.keyErrors, state.stats.keyTotals],
  );
  const weak = weakKeys(counts.keyErrors, counts.keyTotals, { minAttempts: 5, limit: 6 });
  const common = commonErrors(counts.keyErrors, 6);
  const overall = curriculumProgress(state);
  const recent = state.sessions.slice(-8).reverse();
  const hasAny = state.stats.totalSessions > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Progress"
        subtitle="Everything here is calculated from your saved sessions on this device."
        actions={<Segmented label="Date range" value={range} options={RANGES.map((r) => ({ value: r.id, label: r.label }))} onChange={setRange} />}
      />

      {!hasAny ? (
        <EmptyState
          icon={<LineChart size={36} />}
          title="No sessions yet"
          action={
            <Link to="/learn" className="btn btn-primary">
              Start your first lesson
            </Link>
          }
        >
          Complete a lesson, practice session or speed test and your charts, weak keys and trends will appear here. Nothing is shown until it is real.
        </EmptyState>
      ) : (
        <>
          <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatCard icon={<ListChecks size={16} />} label="Sessions" value={summary.sessions} hint={RANGES.find((r) => r.id === range)?.label} />
            <StatCard icon={<Trophy size={16} />} label="Best speed" value={summary.bestWpm === null ? '—' : `${summary.bestWpm} WPM`} />
            <StatCard icon={<Gauge size={16} />} label="Average speed" value={summary.avgWpm === null ? '—' : `${summary.avgWpm} WPM`} />
            <StatCard icon={<Target size={16} />} label="Average accuracy" value={summary.avgAccuracy === null ? '—' : `${summary.avgAccuracy}%`} />
            <StatCard icon={<Clock size={16} />} label="Practice time" value={formatDuration(summary.totalMs)} />
            <StatCard icon={<GraduationCap size={16} />} label="Lessons completed" value={`${overall.done} / ${overall.total}`} hint="All time" />
          </section>

          {sessions.length === 0 ? (
            <EmptyState icon={<LineChart size={32} />} title="No sessions in this period">
              Try a longer date range, or practice today to add data.
            </EmptyState>
          ) : (
            <section className="grid gap-4 lg:grid-cols-2" aria-label="Charts">
              <div className="card p-5">
                <LazyTrendChart data={points} metric="wpm" title="Speed over time (net WPM)" />
              </div>
              <div className="card p-5">
                <LazyTrendChart data={points} metric="accuracy" title="Accuracy over time (%)" />
              </div>
              <div className="card p-5 lg:col-span-2">
                <LazyActivityChart data={activity} title="Daily practice (minutes)" />
                {range === 'all' ? <p className="mt-2 text-xs text-mute">Showing up to the last 90 days.</p> : null}
              </div>
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-2" aria-label="Keys">
            <div className="card p-5">
              <h2 className="font-bold">Weakest keys</h2>
              <p className="mb-3 text-xs text-mute">Highest error rate, with at least 5 attempts.</p>
              {weak.length === 0 ? (
                <p className="text-sm text-mute">Not enough data yet.</p>
              ) : (
                <ul className="space-y-2">
                  {weak.map((w) => (
                    <li key={w.key} className="flex items-center gap-3 text-sm">
                      <kbd className="w-14 rounded-md border border-line bg-surface px-2 py-0.5 text-center font-mono text-xs">{keyLabel(w.key)}</kbd>
                      <ProgressBar value={w.rate * 100} label={`${keyLabel(w.key)} error rate`} className="flex-1" />
                      <span className="w-24 text-right tabular-nums text-mute">
                        {Math.round(w.rate * 100)}% · {w.errors}/{w.total}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/practice" className="btn btn-secondary mt-4">
                Practise weak keys
              </Link>
            </div>
            <div className="card p-5">
              <h2 className="font-bold">Most common errors</h2>
              <p className="mb-3 text-xs text-mute">Keys with the most mistakes overall.</p>
              {common.length === 0 ? (
                <p className="text-sm text-mute">No mistakes recorded. Nice.</p>
              ) : (
                <ul className="space-y-2">
                  {common.map((c) => (
                    <li key={c.key} className="flex items-center justify-between text-sm">
                      <kbd className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-xs">{keyLabel(c.key)}</kbd>
                      <span className="tabular-nums text-mute">
                        {c.errors} mistake{c.errors === 1 ? '' : 's'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="card p-5" aria-labelledby="curr">
            <h2 id="curr" className="mb-4 font-bold">
              Curriculum completion
            </h2>
            <ul className="space-y-3">
              {CURRICULUM.map((m) => {
                const mp = moduleProgress(state, m);
                return (
                  <li key={m.id} className="flex items-center gap-3 text-sm">
                    <span className="w-48 shrink-0 truncate sm:w-64">
                      {m.number}. {m.title}
                    </span>
                    <ProgressBar value={mp.percent} label={`${m.title} completion`} className="flex-1" />
                    <span className="w-12 text-right tabular-nums text-mute">{mp.percent}%</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card p-5" aria-labelledby="recent-sessions">
            <h2 id="recent-sessions" className="mb-3 font-bold">
              Recent sessions
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="text-xs uppercase text-mute">
                  <tr>
                    <th className="py-1 pr-3 font-semibold">Date</th>
                    <th className="py-1 pr-3 font-semibold">Session</th>
                    <th className="py-1 pr-3 text-right font-semibold">WPM</th>
                    <th className="py-1 text-right font-semibold">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s) => (
                    <tr key={s.id} className="border-t border-line">
                      <td className="py-1.5 pr-3 text-mute">{formatShortDate(s.date)}</td>
                      <td className="py-1.5 pr-3">{s.label}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{s.netWpm}</td>
                      <td className="py-1.5 text-right tabular-nums">{s.accuracy === null ? 'n/a' : `${s.accuracy}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-mute">
              TypeZero keeps your most recent 500 sessions in detail. Lifetime totals, best scores, key statistics and daily activity are kept beyond that.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
