import { Check, Lock, Zap } from 'lucide-react';
import { PageHeader, ProgressBar } from '../components/ui/ui';
import { ACHIEVEMENTS } from '../data/achievements';
import { useProgress } from '../hooks/useProgress';
import { levelInfo } from '../lib/levels';

export default function AchievementsPage() {
  const { state } = useProgress();
  const info = levelInfo(state.xp.total);
  const unlockedCount = ACHIEVEMENTS.filter((a) => state.achievements[a.id] !== undefined).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Achievements" subtitle="Achievements unlock from your real activity. Visiting this page never unlocks anything." />

      <section className="card space-y-3 p-5" aria-label="Level">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="label">Level</p>
            <p className="text-2xl font-bold">
              {info.level} <span className="text-base font-medium text-mute">· {info.title}</span>
            </p>
          </div>
          <p className="flex items-center gap-1 text-sm text-mute">
            <Zap size={14} className="text-accent" aria-hidden="true" />
            {info.totalXp} XP · {info.xpToNext} to level {info.level + 1}
          </p>
        </div>
        <ProgressBar value={info.progress * 100} label={`Progress to level ${info.level + 1}`} />
        <p className="text-sm text-mute">
          {unlockedCount} of {ACHIEVEMENTS.length} achievements unlocked
        </p>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const at = state.achievements[a.id];
          const unlocked = at !== undefined;
          const p = a.progress(state);
          const pct = Math.min(100, (p.value / p.target) * 100);
          const Icon = a.icon;
          return (
            <li key={a.id} className={`card flex gap-4 p-4 ${unlocked ? '!border-accent/60' : ''}`}>
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${unlocked ? 'bg-accent text-accent-ink' : 'bg-surface text-mute'}`}
                aria-hidden="true"
              >
                <Icon size={24} />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex items-center gap-2 font-semibold">
                  {a.name}
                  {unlocked ? (
                    <span className="chip text-good">
                      <Check size={12} aria-hidden="true" />
                      Unlocked
                    </span>
                  ) : (
                    <span className="chip">
                      <Lock size={12} aria-hidden="true" />
                      Locked
                    </span>
                  )}
                </p>
                <p className="text-sm text-mute">{a.description}</p>
                {unlocked ? (
                  <p className="text-xs text-mute">
                    {new Date(at).toLocaleDateString()}
                    {a.xp > 0 ? ` · +${a.xp} XP` : ''}
                  </p>
                ) : (
                  <>
                    <ProgressBar value={pct} label={`${a.name} progress`} />
                    <p className="text-xs text-mute">
                      {Math.round(Math.min(p.value, p.target) * 10) / 10} / {p.target}
                      {a.xp > 0 ? ` · +${a.xp} XP reward` : ''}
                    </p>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
