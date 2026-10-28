import { Sparkles, Trophy } from 'lucide-react';
import { ACHIEVEMENT_BY_ID } from '../../data/achievements';
import { formatDuration } from '../../lib/dates';
import type { Metrics, RewardSummary } from '../../types';

interface ResultSummaryProps {
  metrics: Metrics;
  reward: RewardSummary | null;
  /** Best net WPM before this session, for comparison. */
  previousBest?: number | null;
  heading?: string;
  /** False when there is no target text, so accuracy and error counts are not defined. */
  scored?: boolean;
}

function Cell({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <dt className="label">{label}</dt>
      <dd className={`mt-1 font-bold tabular-nums ${big ? 'text-4xl text-accent' : 'text-xl'}`}>{value}</dd>
    </div>
  );
}

export default function ResultSummary({ metrics, reward, previousBest, heading = 'Results', scored = true }: ResultSummaryProps) {
  const net = Math.round(metrics.netWpm * 10) / 10;
  let comparison: string | null = null;
  if (previousBest !== undefined && previousBest !== null && previousBest > 0) {
    const diff = Math.round((net - previousBest) * 10) / 10;
    comparison =
      diff > 0
        ? `${diff} WPM faster than your previous best of ${previousBest}.`
        : diff === 0
          ? `Matches your best of ${previousBest} WPM.`
          : `${Math.abs(diff)} WPM below your best of ${previousBest}.`;
  } else if (previousBest === 0) {
    comparison = 'This is your first scored result. It sets your baseline.';
  }

  return (
    <div className="card space-y-4 p-4 sm:p-6" aria-label={heading}>
      <h2 className="text-xl font-bold">{heading}</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cell label="Net WPM" value={String(net)} big />
        <Cell label="Accuracy" value={scored ? `${Math.round(metrics.accuracy * 10) / 10}%` : 'n/a'} big />
        <Cell label="Gross WPM" value={String(Math.round(metrics.grossWpm * 10) / 10)} />
        <Cell label="Duration" value={formatDuration(metrics.elapsedMs)} />
        {scored ? <Cell label="Correct" value={String(metrics.correct)} /> : null}
        {scored ? <Cell label="Incorrect" value={String(metrics.incorrect)} /> : null}
        <Cell label="Total typed" value={String(metrics.typed)} />
        {scored ? <Cell label="Left uncorrected" value={String(metrics.uncorrected)} /> : null}
      </dl>
      {comparison ? <p className="text-sm text-mute">{comparison}</p> : null}

      {reward?.recorded ? (
        <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={16} className="text-accent" aria-hidden="true" />
            {reward.xp > 0 ? `+${reward.xp} XP earned` : 'No XP this time'}
            {reward.personalBest ? <span className="chip text-accent">New personal best</span> : null}
            {reward.levelAfter > reward.levelBefore ? <span className="chip text-accent">Level {reward.levelAfter}</span> : null}
          </p>
          {reward.items.length > 0 ? (
            <ul className="space-y-0.5 text-sm text-mute">
              {reward.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-4">
                  <span>{i.label}</span>
                  <span className="tabular-nums">+{i.xp}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-mute">XP is limited per day for repeated sessions, and one-time rewards are only given once.</p>
          )}
          {reward.achievements.map((id) => (
            <p key={id} className="flex items-center gap-2 text-sm font-medium">
              <Trophy size={16} className="text-accent" aria-hidden="true" />
              Achievement unlocked: {ACHIEVEMENT_BY_ID[id]?.name ?? id}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
