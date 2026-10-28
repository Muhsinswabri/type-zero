import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, CheckCircle2, Clock, Flame, Gauge, GraduationCap, Sparkles, Target, Trophy, Zap } from 'lucide-react';
import { LazyTrendChart } from '../components/charts/LazyCharts';
import { EmptyState, ProgressBar, StatCard } from '../components/ui/ui';
import { challengeForDate, challengeProgress } from '../data/challenges';
import { MODULE_BY_ID } from '../data/curriculum';
import { useProgress } from '../hooks/useProgress';
import { dayPoints, lifetimeAccuracy, recentSpeed } from '../lib/analytics';
import { formatDuration, lastNDays, toDateKey } from '../lib/dates';
import { levelInfo } from '../lib/levels';
import { currentStreak, curriculumProgress, recommendedLesson, remainingMinutes } from '../lib/progression';

function greeting(hour: number): string {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const { state } = useProgress();
  const today = toDateKey();
  const info = levelInfo(state.xp.total);
  const streak = currentStreak(state.streak, today);
  const next = recommendedLesson(state);
  const overall = curriculumProgress(state);
  const challenge = challengeForDate(today);
  const cProgress = challengeProgress(challenge, state.daily[today]);
  const challengeDone = state.challenges[today] !== undefined;
  const minutesToday = (state.daily[today]?.durationMs ?? 0) / 60_000;
  const goal = state.settings.dailyGoalMinutes;

  const recent = useMemo(() => {
    const days = new Set(lastNDays(14, today));
    return dayPoints(state.sessions.filter((s) => days.has(s.date)));
  }, [state.sessions, today]);

  const speed = recentSpeed(state);
  const accuracy = lifetimeAccuracy(state);
  const progress = next ? state.lessons[next.id] : undefined;

  return (
    <div className="space-y-8">
      <section aria-labelledby="hello" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="hello" className="text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting(new Date().getHours())}!
          </h1>
          <p className="mt-1 text-mute">
            Level {info.level} · {info.title} · daily goal {goal} min
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip text-ink">
            <Flame size={14} aria-hidden="true" className={streak > 0 ? 'text-accent' : ''} />
            {streak}-day streak
          </span>
          <span className="chip text-ink">
            <Zap size={14} aria-hidden="true" className="text-accent" />
            {info.totalXp} XP
          </span>
        </div>
      </section>

      <section aria-label="Statistics" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard icon={<Gauge size={16} />} label="Current speed" value={speed === null ? '—' : `${speed} WPM`} hint="Average of your last 5 sessions" />
        <StatCard icon={<Trophy size={16} />} label="Best speed" value={state.stats.bestWpm > 0 ? `${state.stats.bestWpm} WPM` : '—'} />
        <StatCard icon={<Target size={16} />} label="Avg accuracy" value={accuracy === null ? '—' : `${accuracy}%`} />
        <StatCard icon={<Clock size={16} />} label="Practice time" value={formatDuration(state.stats.totalDurationMs)} />
        <StatCard icon={<GraduationCap size={16} />} label="Lessons done" value={`${overall.done} / ${overall.total}`} />
        <StatCard icon={<Sparkles size={16} />} label="Total XP" value={info.totalXp} hint={`${info.xpToNext} XP to level ${info.level + 1}`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <section aria-labelledby="continue" className="card flex flex-col justify-between gap-4 p-5 lg:col-span-3">
          <div>
            <p className="label">{progress && progress.attempts > 0 ? 'Continue learning' : 'Next lesson'}</p>
            {next ? (
              <>
                <h2 id="continue" className="mt-2 text-xl font-bold">
                  {next.title}
                </h2>
                <p className="mt-1 text-mute">{next.description}</p>
                <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-mute">
                  <span className="chip">{MODULE_BY_ID[next.moduleId].title}</span>
                  <span className="chip">
                    <Clock size={12} aria-hidden="true" />
                    {next.durationMin} min
                  </span>
                  <span className="chip">{progress && progress.attempts > 0 ? `${progress.attempts} attempt${progress.attempts === 1 ? '' : 's'}` : 'Not started'}</span>
                </p>
              </>
            ) : (
              <>
                <h2 id="continue" className="mt-2 text-xl font-bold">
                  You finished the whole curriculum
                </h2>
                <p className="mt-1 text-mute">Keep your skills sharp with practice sessions and speed tests.</p>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {next ? (
              <Link to={`/learn/${next.id}`} className="btn btn-primary">
                {progress && progress.attempts > 0 ? 'Continue' : 'Start'}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : (
              <Link to="/practice" className="btn btn-primary">
                Go to practice
              </Link>
            )}
            <span className="text-sm text-mute">
              {overall.percent}% complete · about {remainingMinutes(state)} min left
            </span>
          </div>
          <ProgressBar value={overall.percent} label="Curriculum completion" />
        </section>

        <section aria-labelledby="daily" className="card flex flex-col gap-3 p-5 lg:col-span-2">
          <p className="label">Daily challenge</p>
          <h2 id="daily" className="flex items-center gap-2 text-lg font-bold">
            {challenge.title}
            {challengeDone ? <CheckCircle2 size={18} className="text-good" aria-label="Completed" /> : null}
          </h2>
          <p className="text-sm text-mute">{challenge.description}</p>
          <ProgressBar
            value={(cProgress.value / cProgress.target) * 100}
            label={`${challenge.title} progress`}
            tone={challengeDone ? 'good' : 'accent'}
          />
          <p className="text-xs text-mute">
            {Math.round(cProgress.value * 10) / 10} / {cProgress.target} {challenge.unit}
          </p>
          <div className="mt-auto border-t border-line pt-3">
            <p className="text-sm font-medium">
              Today: {Math.round(minutesToday * 10) / 10} / {goal} min
            </p>
            <ProgressBar value={(minutesToday / goal) * 100} label="Daily goal progress" className="mt-2" tone={minutesToday >= goal ? 'good' : 'accent'} />
          </div>
        </section>
      </div>

      <section aria-labelledby="recent" className="card p-5">
        <h2 id="recent" className="mb-4 text-lg font-bold">
          Recent progress
        </h2>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Activity size={32} />}
            title="No practice history yet"
            action={
              <Link to="/practice" className="btn btn-primary">
                Start practicing
              </Link>
            }
          >
            Finish a lesson, practice session or speed test and your speed and accuracy will show up here.
          </EmptyState>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <LazyTrendChart data={recent} metric="wpm" title="Speed (net WPM, last 14 days)" />
            <LazyTrendChart data={recent} metric="accuracy" title="Accuracy (%, last 14 days)" />
          </div>
        )}
      </section>
    </div>
  );
}
