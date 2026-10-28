import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, RotateCcw, Shuffle } from 'lucide-react';
import ResultSummary from '../components/typing/ResultSummary';
import TypingPane from '../components/typing/TypingPane';
import { PageHeader, Segmented } from '../components/ui/ui';
import { START_LESSON } from '../data/curriculum';
import { MAX_CUSTOM_CHARS, MIN_CUSTOM_CHARS, PASSAGE_CATEGORIES, normalizeCustomText, type PassageCategoryId } from '../data/passages';
import { useLeaveGuard } from '../hooks/useLeaveGuard';
import { useProgress } from '../hooks/useProgress';
import { useTypingEngine } from '../hooks/useTypingEngine';
import { sessionFromEngine } from '../lib/sessionBuilder';
import { buildTestText } from '../lib/textGen';
import type { RewardSummary, StartLevel, TestDuration } from '../types';

const DURATIONS: TestDuration[] = [15, 30, 60, 120];

function suggestLevel(netWpm: number): StartLevel {
  if (netWpm < 15) return 'beginner';
  if (netWpm < 35) return 'intermediate';
  return 'advanced';
}

export default function TestPage() {
  const { state, updateSettings, recordActivity, completeOnboarding } = useProgress();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const quick = params.get('quick') === '1';

  const [duration, setDuration] = useState<TestDuration>(quick ? 30 : state.settings.testDuration);
  const [category, setCategory] = useState<PassageCategoryId>(quick ? 'common-words' : 'easy-sentences');
  const [seed, setSeed] = useState(0);
  const [customDraft, setCustomDraft] = useState('');
  const [custom, setCustom] = useState('');
  const [reward, setReward] = useState<RewardSummary | null>(null);
  const [prevBest, setPrevBest] = useState<number | null>(null);
  const recordedId = useRef<string | null>(null);

  const text = useMemo(
    () => buildTestText(category, duration, Math.random, custom),
    // `seed` forces a new random passage on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [category, duration, custom, seed],
  );
  const needsCustom = category === 'custom' && text.length < MIN_CUSTOM_CHARS;

  const engine = useTypingEngine(text.length > 0 ? text : ' ', {
    allowBackspace: true,
    stopOnError: false,
    limitMs: duration * 1000,
  });
  const status = engine.state.status;
  useLeaveGuard(status === 'running');

  useEffect(() => {
    if (status === 'idle') setReward(null);
    if (status !== 'finished') return;
    const label = PASSAGE_CATEGORIES.find((c) => c.id === category)?.label ?? category;
    const session = sessionFromEngine(engine.state, { type: 'test', refId: category, label: `${label} · ${duration}s`, targetSec: duration });
    if (!session || recordedId.current === session.id) return;
    recordedId.current = session.id;
    setPrevBest(state.stats.testSessions > 0 ? state.stats.bestTestWpm : 0);
    setReward(recordActivity({ session }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const changeDuration = (d: TestDuration) => {
    setDuration(d);
    if (!quick) updateSettings({ testDuration: d });
  };

  const finished = status === 'finished';
  const running = status === 'running';
  const suggestion = suggestLevel(engine.metrics.netWpm);

  return (
    <div className="space-y-6">
      <PageHeader
        title={quick ? 'Quick typing test' : 'Typing speed test'}
        subtitle={
          quick
            ? 'A 30-second test to find a good starting point. It is optional, and nothing here is required to start learning.'
            : 'Type the passage as accurately and quickly as you can. The timer starts with your first keystroke.'
        }
      />

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="label mb-2">Duration</p>
          <Segmented label="Duration" value={duration} options={DURATIONS.map((d) => ({ value: d, label: `${d}s` }))} onChange={(d) => !running && changeDuration(d)} />
        </div>
        <div>
          <label htmlFor="category" className="label mb-2 block">
            Passages
          </label>
          <select
            id="category"
            value={category}
            disabled={running}
            onChange={(e) => setCategory(e.target.value as PassageCategoryId)}
            className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm disabled:opacity-50"
          >
            {PASSAGE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => engine.restart()} disabled={status === 'idle'}>
            <RotateCcw size={16} aria-hidden="true" />
            Restart
          </button>
          {category !== 'custom' ? (
            <button type="button" className="btn btn-secondary" onClick={() => setSeed((s) => s + 1)} disabled={running}>
              <Shuffle size={16} aria-hidden="true" />
              New passage
            </button>
          ) : null}
        </div>
      </div>

      {category === 'custom' ? (
        <div className="card space-y-3 p-4">
          <label htmlFor="custom-text" className="label block">
            Your text ({MIN_CUSTOM_CHARS}–{MAX_CUSTOM_CHARS} characters)
          </label>
          <textarea
            id="custom-text"
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value.slice(0, MAX_CUSTOM_CHARS * 2))}
            rows={4}
            className="w-full rounded-xl border border-line bg-surface p-3 text-sm"
            placeholder="Paste or write the text you want to practise…"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-primary"
              disabled={running || normalizeCustomText(customDraft).length < MIN_CUSTOM_CHARS}
              onClick={() => setCustom(normalizeCustomText(customDraft).slice(0, MAX_CUSTOM_CHARS))}
            >
              Use this text
            </button>
            <p className="text-xs text-mute">Line breaks become spaces, and characters that are not on a standard keyboard are removed.</p>
          </div>
        </div>
      ) : null}

      {needsCustom ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-mute">Add some custom text above to begin.</p>
      ) : (
        <TypingPane engine={engine} settings={state.settings} clock="remaining" hideKeyboard={finished} lines={3}>
          {finished ? (
            <div className="space-y-4">
              <ResultSummary metrics={engine.metrics} reward={reward} previousBest={prevBest} heading="Test results" />
              {quick ? (
                <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <p className="text-sm">
                    Suggested starting level: <strong className="capitalize">{suggestion}</strong>
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      completeOnboarding({ startLevel: suggestion, dailyGoalMinutes: state.settings.dailyGoalMinutes, layout: state.settings.layout });
                      navigate(`/learn/${START_LESSON[suggestion]}`);
                    }}
                  >
                    Start learning at this level
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn btn-primary" onClick={() => engine.restart()}>
                  <RotateCcw size={16} aria-hidden="true" />
                  Retry
                </button>
                {category !== 'custom' ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setSeed((s) => s + 1)}>
                    <Shuffle size={16} aria-hidden="true" />
                    New passage
                  </button>
                ) : null}
                <Link to="/" className="btn btn-ghost">
                  Back to dashboard
                </Link>
              </div>
            </div>
          ) : null}
        </TypingPane>
      )}
    </div>
  );
}
