import { Outlet, NavLink, Link } from 'react-router-dom';
import { Flame, Gauge, GraduationCap, Dumbbell, Keyboard, LayoutDashboard, Settings as SettingsIcon, TrendingUp, Trophy, TriangleAlert, X } from 'lucide-react';
import { useProgress } from '../../hooks/useProgress';
import { toDateKey } from '../../lib/dates';
import { levelInfo } from '../../lib/levels';
import { currentStreak } from '../../lib/progression';
import { ProgressBar, ToastRegion } from '../ui/ui';

const PRIMARY = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/learn', label: 'Learn', icon: GraduationCap, end: false },
  { to: '/practice', label: 'Practice', icon: Dumbbell, end: false },
  { to: '/test', label: 'Speed Test', icon: Gauge, end: false },
  { to: '/progress', label: 'Progress', icon: TrendingUp, end: false },
];

const SECONDARY = [
  { to: '/achievements', label: 'Achievements', icon: Trophy },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 rounded-lg font-bold tracking-tight" aria-label="TypeZero home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-ink">
        <Keyboard size={18} aria-hidden="true" />
      </span>
      <span className="text-lg">
        Type<span className="text-accent">Zero</span>
      </span>
    </Link>
  );
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-accent/15 text-accent' : 'text-mute hover:bg-surface hover:text-ink'
  }`;

export default function AppShell() {
  const { state, persistent, notice, dismissNotice, toasts, dismissToast } = useProgress();
  const info = levelInfo(state.xp.total);
  const streak = currentStreak(state.streak, toDateKey());

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-ink">
        Skip to main content
      </a>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface/60 p-4 lg:flex">
        <div className="px-1 py-2">
          <Logo />
        </div>
        <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
          {PRIMARY.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <nav aria-label="Secondary" className="mt-6 flex flex-col gap-1 border-t border-line pt-4">
          {SECONDARY.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto card space-y-2 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Level {info.level}</span>
            <span className="flex items-center gap-1 text-mute">
              <Flame size={14} aria-hidden="true" className={streak > 0 ? 'text-accent' : ''} />
              {streak} day{streak === 1 ? '' : 's'}
            </span>
          </div>
          <ProgressBar value={info.progress * 100} label={`Progress to level ${info.level + 1}`} />
          <p className="text-xs text-mute">
            {info.xpToNext} XP to level {info.level + 1}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
          <Logo />
          <div className="flex items-center gap-1">
            <span className="chip mr-1" aria-label={`${streak} day streak`}>
              <Flame size={14} aria-hidden="true" className={streak > 0 ? 'text-accent' : ''} />
              {streak}
            </span>
            {SECONDARY.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                className={({ isActive }) => `rounded-lg p-2 ${isActive ? 'bg-accent/15 text-accent' : 'text-mute hover:text-ink'}`}
              >
                <Icon size={20} aria-hidden="true" />
              </NavLink>
            ))}
          </div>
        </header>

        {notice || !persistent ? (
          <div role="status" className="flex items-start gap-3 border-b border-line bg-surface px-4 py-2.5 text-sm">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-bad" aria-hidden="true" />
            <p className="flex-1 text-mute">
              {notice ?? 'Progress is not being saved in this browser. You can still practice, but it may be lost when you close the page.'}
            </p>
            {notice ? (
              <button type="button" aria-label="Dismiss message" className="rounded p-1 text-mute hover:text-ink" onClick={dismissNotice}>
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 outline-none sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
          <Outlet />
        </main>

        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-bg/95 backdrop-blur lg:hidden">
          {PRIMARY.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-accent' : 'text-mute'}`
              }
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <ToastRegion toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
