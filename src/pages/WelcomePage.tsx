import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Gauge, Keyboard, Target, TrendingUp } from 'lucide-react';
import { Segmented } from '../components/ui/ui';
import { LAYOUT_OPTIONS } from '../data/keyboard';
import { START_LESSON } from '../data/curriculum';
import { useProgress } from '../hooks/useProgress';
import type { DailyGoal, LayoutId, StartLevel } from '../types';

const LEVELS: { id: StartLevel; title: string; text: string }[] = [
  { id: 'beginner', title: 'Beginner', text: 'I have never learned to touch type. Start from the keyboard basics.' },
  { id: 'intermediate', title: 'Intermediate', text: 'I know the letters but look at the keys. Start with the full alphabet.' },
  { id: 'advanced', title: 'Advanced', text: 'I type fairly well. Start with accuracy and speed training.' },
];

export default function WelcomePage() {
  const { state, completeOnboarding } = useProgress();
  const navigate = useNavigate();
  const [step, setStep] = useState<'hero' | 'setup'>('hero');
  const [level, setLevel] = useState<StartLevel>(state.startLevel);
  const [goal, setGoal] = useState<DailyGoal>(state.settings.dailyGoalMinutes);
  const [layout, setLayout] = useState<LayoutId>(state.settings.layout);

  const begin = () => {
    completeOnboarding({ startLevel: level, dailyGoalMinutes: goal, layout });
    navigate(`/learn/${START_LESSON[level]}`);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-10">
      <div className="mb-8 flex items-center gap-2 font-bold">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-ink">
          <Keyboard size={20} aria-hidden="true" />
        </span>
        <span className="text-xl">
          Type<span className="text-accent">Zero</span>
        </span>
      </div>

      {step === 'hero' ? (
        <main>
          <p className="label text-accent">Start at Zero. Type Like a Pro.</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Your typing journey starts here.</h1>
          <p className="mt-4 max-w-xl text-lg text-mute">
            Learn to type without looking at your keyboard. Build accuracy, develop muscle memory, and watch your speed grow.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary !px-6 !py-3 text-base" onClick={() => setStep('setup')}>
              Start Learning
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-secondary !px-6 !py-3 text-base" onClick={() => navigate('/test?quick=1')}>
              <Gauge size={18} aria-hidden="true" />
              Take a Quick Typing Test
            </button>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Keyboard, title: 'Learn step by step', text: '46 lessons from the home row to real-world writing.' },
              { icon: Target, title: 'Accuracy first', text: 'Build correct habits before chasing speed.' },
              { icon: TrendingUp, title: 'Track real progress', text: 'Everything is saved privately in your browser. No account.' },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="card p-4">
                <Icon size={20} className="text-accent" aria-hidden="true" />
                <h2 className="mt-2 font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-mute">{text}</p>
              </li>
            ))}
          </ul>
        </main>
      ) : (
        <main className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Set up your practice</h1>
            <p className="mt-2 text-mute">Three quick choices. You can change all of them later in Settings.</p>
          </div>

          <fieldset>
            <legend className="label mb-3">Where should we start?</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {LEVELS.map((l) => (
                <label
                  key={l.id}
                  className={`card cursor-pointer p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                    level === l.id ? '!border-accent bg-accent/10' : 'hover:border-mute/50'
                  }`}
                >
                  <input type="radio" name="level" className="sr-only" checked={level === l.id} onChange={() => setLevel(l.id)} />
                  <span className="font-semibold">{l.title}</span>
                  <span className="mt-1 block text-sm text-mute">{l.text}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <p className="label mb-3" id="goal-label">
              Daily goal
            </p>
            <Segmented
              label="Daily goal"
              value={goal}
              options={([5, 10, 15, 20] as DailyGoal[]).map((m) => ({ value: m, label: `${m} min` }))}
              onChange={setGoal}
            />
          </div>

          <div>
            <label className="label mb-3 block" htmlFor="layout">
              Keyboard layout
            </label>
            <select
              id="layout"
              value={layout}
              onChange={(e) => setLayout(e.target.value as LayoutId)}
              className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
            >
              {LAYOUT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id} disabled={!o.available}>
                  {o.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-mute">More layouts can be added in the future.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary !px-6" onClick={begin}>
              Begin
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setStep('hero')}>
              Back
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
