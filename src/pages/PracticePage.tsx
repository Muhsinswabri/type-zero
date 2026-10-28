import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Shuffle } from 'lucide-react';
import ResultSummary from '../components/typing/ResultSummary';
import TypingPane from '../components/typing/TypingPane';
import { PageHeader, Segmented, Switch } from '../components/ui/ui';
import { MAX_CUSTOM_CHARS, MIN_CUSTOM_CHARS, normalizeCustomText } from '../data/passages';
import { useClock } from '../hooks/useTimer';
import { useLeaveGuard } from '../hooks/useLeaveGuard';
import { useProgress } from '../hooks/useProgress';
import { useTypingEngine } from '../hooks/useTypingEngine';
import { toDateKey, formatClock } from '../lib/dates';
import { sessionFromEngine } from '../lib/sessionBuilder';
import { buildPracticeText, type PracticeConfig, type PracticeMode, type RowId } from '../lib/textGen';
import { buildMetrics, round1, weakKeys } from '../lib/typingMetrics';
import type { RewardSummary, SessionRecord, TypingDifficulty } from '../types';

const MODES: { id: PracticeMode; label: string; hint: string }[] = [
  { id: 'keys', label: 'Individual keys', hint: 'Drill the keys you pick.' },
  { id: 'rows', label: 'Keyboard rows', hint: 'Practise whole rows.' },
  { id: 'words', label: 'Words', hint: 'Single words by difficulty.' },
  { id: 'sentences', label: 'Sentences', hint: 'Full sentences.' },
  { id: 'punctuation', label: 'Punctuation', hint: 'Commas, quotes and more.' },
  { id: 'weak', label: 'Weak keys', hint: 'Based on your mistakes.' },
  { id: 'free', label: 'Free typing', hint: 'Type anything. Speed only.' },
  { id: 'custom', label: 'Custom text', hint: 'Practise your own text.' },
];

const KEY_CHOICES = [...'abcdefghijklmnopqrstuvwxyz0123456789', ';', ',', '.', '/', "'"];
const ROWS: { id: RowId; label: string }[] = [
  { id: 'number', label: 'Number row' },
  { id: 'top', label: 'Top row' },
  { id: 'home', label: 'Home row' },
  { id: 'bottom', label: 'Bottom row' },
];
const SECONDS = [60, 120, 180, 300];

export default function PracticePage() {
  const { state, recordActivity } = useProgress();
  const { settings } = state;
  const [cfg, setCfg] = useState<PracticeConfig>({
    mode: 'words',
    keys: ['f', 'j'],
    rows: ['home'],
    difficulty: settings.difficulty === 'easy' ? 'easy' : settings.difficulty === 'hard' ? 'hard' : 'medium',
    seconds: 60,
    custom: '',
  });
  const [allowBackspace, setAllowBackspace] = useState(settings.difficulty !== 'hard');
  const [customDraft, setCustomDraft] = useState('');
  const [seed, setSeed] = useState(0);
  const [reward, setReward] = useState<RewardSummary | null>(null);
  const recordedId = useRef<string | null>(null);

  const patch = (p: Partial<PracticeConfig>) => setCfg((c) => ({ ...c, ...p }));

  const weak = useMemo(
    () => weakKeys(state.stats.keyErrors, state.stats.keyTotals, { minAttempts: 10, limit: 6 }).map((w) => w.key),
    [state.stats.keyErrors, state.stats.keyTotals],
  );

  const generated = useMemo(
    () => buildPracticeText(cfg, weak, Math.random),
    // `seed` regenerates the text on demand; `weak` is read when the mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cfg, seed],
  );

  const free = cfg.mode === 'free';
  const needsCustom = cfg.mode === 'custom' && generated.text.length < MIN_CUSTOM_CHARS;
  const label = MODES.find((m) => m.id === cfg.mode)?.label ?? 'Practice';

  const engine = useTypingEngine(generated.text.length > 0 ? generated.text : ' ', {
    allowBackspace,
    stopOnError: false,
    limitMs: cfg.mode === 'custom' ? null : cfg.seconds * 1000,
  });
  const status = engine.state.status;
  useLeaveGuard(!free && status === 'running');

  useEffect(() => {
    if (status === 'idle') setReward(null);
    if (status !== 'finished' || free) return;
    const session = sessionFromEngine(engine.state, {
      type: 'practice',
      refId: cfg.mode,
      label: `Practice · ${label}`,
      targetSec: cfg.mode === 'custom' ? null : cfg.seconds,
    });
    if (!session || recordedId.current === session.id) return;
    recordedId.current = session.id;
    setReward(recordActivity({ session }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const finished = status === 'finished' && !free;
  const running = status === 'running';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice"
        subtitle="Pick what you want to work on. Sessions are saved when you finish them, and XP is limited per day so repeating the same exercise cannot be farmed."
      />

      <div role="radiogroup" aria-label="Practice mode" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={cfg.mode === m.id}
            disabled={running}
            onClick={() => patch({ mode: m.id })}
            className={`card p-3 text-left transition-colors disabled:opacity-60 ${cfg.mode === m.id ? '!border-accent bg-accent/10' : 'hover:border-mute/60'}`}
          >
            <span className="block text-sm font-semibold">{m.label}</span>
            <span className="block text-xs text-mute">{m.hint}</span>
          </button>
        ))}
      </div>

      <div className="card space-y-4 p-4">
        {cfg.mode === 'keys' ? (
          <fieldset>
            <legend className="label mb-2">Keys to practise</legend>
            <div className="flex flex-wrap gap-1.5">
              {KEY_CHOICES.map((k) => {
                const on = cfg.keys.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    aria-label={`Key ${k}`}
                    disabled={running}
                    onClick={() => patch({ keys: on ? cfg.keys.filter((x) => x !== k) : [...cfg.keys, k] })}
                    className={`h-9 w-9 rounded-lg border text-sm font-semibold uppercase ${on ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface text-ink hover:border-mute/60'}`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {cfg.mode === 'rows' ? (
          <fieldset>
            <legend className="label mb-2">Rows</legend>
            <div className="flex flex-wrap gap-3">
              {ROWS.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[rgb(var(--c-accent))]"
                    checked={cfg.rows.includes(r.id)}
                    disabled={running}
                    onChange={(e) => patch({ rows: e.target.checked ? [...cfg.rows, r.id] : cfg.rows.filter((x) => x !== r.id) })}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {cfg.mode === 'custom' ? (
          <div className="space-y-2">
            <label htmlFor="practice-custom" className="label block">
              Your text ({MIN_CUSTOM_CHARS}–{MAX_CUSTOM_CHARS} characters)
            </label>
            <textarea
              id="practice-custom"
              rows={4}
              value={customDraft}
              onChange={(e) => setCustomDraft(e.target.value.slice(0, MAX_CUSTOM_CHARS * 2))}
              className="w-full rounded-xl border border-line bg-surface p-3 text-sm"
              placeholder="Paste or write the text you want to practise…"
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={running || normalizeCustomText(customDraft).length < MIN_CUSTOM_CHARS}
              onClick={() => patch({ custom: normalizeCustomText(customDraft).slice(0, MAX_CUSTOM_CHARS) })}
            >
              Use this text
            </button>
          </div>
        ) : null}

        {cfg.mode === 'weak' ? (
          <p className="text-sm text-mute">
            {weak.length > 0 ? (
              <>
                Your weakest keys right now: <strong className="text-ink">{weak.join(' ')}</strong>. This drill focuses on them.
              </>
            ) : (
              'Not enough history yet to find weak keys. You will get a home-row warm-up until you have typed more.'
            )}
          </p>
        ) : null}

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          {cfg.mode !== 'custom' ? (
            <div>
              <p className="label mb-2">Duration</p>
              <Segmented label="Duration" value={cfg.seconds} options={SECONDS.map((s) => ({ value: s, label: `${s / 60} min` }))} onChange={(s) => !running && patch({ seconds: s })} />
            </div>
          ) : null}
          {!free && cfg.mode !== 'punctuation' && cfg.mode !== 'custom' ? (
            <div>
              <p className="label mb-2">Difficulty</p>
              <Segmented<TypingDifficulty>
                label="Difficulty"
                value={cfg.difficulty}
                options={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
                onChange={(d) => !running && patch({ difficulty: d })}
              />
            </div>
          ) : null}
          {!free ? (
            <div className="flex items-center gap-2">
              <Switch checked={allowBackspace} onChange={(v) => !running && setAllowBackspace(v)} label="Allow Backspace to correct mistakes" />
              <span className="text-sm">Allow Backspace</span>
            </div>
          ) : null}
          {!free ? (
            <div className="ml-auto flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => engine.restart()} disabled={status === 'idle'}>
                <RotateCcw size={16} aria-hidden="true" />
                Restart
              </button>
              {cfg.mode !== 'custom' ? (
                <button type="button" className="btn btn-secondary" onClick={() => setSeed((s) => s + 1)} disabled={running}>
                  <Shuffle size={16} aria-hidden="true" />
                  New text
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {generated.note ? <p className="text-sm text-mute">{generated.note}</p> : null}
      </div>

      {free ? (
        <FreeTyping seconds={cfg.seconds} />
      ) : needsCustom ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-mute">Add some custom text above to begin.</p>
      ) : (
        <TypingPane engine={engine} settings={settings} clock={cfg.mode === 'custom' ? 'elapsed' : 'remaining'} hideKeyboard={finished} lines={3}>
          {finished ? (
            <div className="space-y-4">
              <ResultSummary metrics={engine.metrics} reward={reward} heading="Practice results" />
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn btn-primary" onClick={() => engine.restart()}>
                  <RotateCcw size={16} aria-hidden="true" />
                  Practice again
                </button>
                {cfg.mode !== 'custom' ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setSeed((s) => s + 1)}>
                    <Shuffle size={16} aria-hidden="true" />
                    New text
                  </button>
                ) : null}
                <Link to="/progress" className="btn btn-ghost">
                  See progress
                </Link>
              </div>
            </div>
          ) : null}
        </TypingPane>
      )}
    </div>
  );
}

/** Free typing has no target text, so only speed is measured. Accuracy is not defined and is not saved. */
function FreeTyping({ seconds }: { seconds: number }) {
  const { recordActivity } = useProgress();
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [reward, setReward] = useState<RewardSummary | null>(null);
  const started = useRef({ perf: 0, wall: 0, typed: 0 });
  const [typed, setTyped] = useState(0);
  const [finalMs, setFinalMs] = useState(0);
  const now = useClock(phase === 'running');
  const limit = seconds * 1000;
  const elapsed = phase === 'running' ? Math.min(limit, Math.max(0, now - started.current.perf)) : phase === 'done' ? finalMs : 0;

  useEffect(() => {
    if (phase !== 'running' || elapsed < limit) return;
    setPhase('done');
    setFinalMs(limit);
    const { wall, typed: count } = started.current;
    if (count === 0) return;
    const m = buildMetrics(count, count, 0, limit);
    const session: SessionRecord = {
      id: `practice-${wall}-free`,
      type: 'practice',
      refId: 'free',
      label: 'Practice · Free typing',
      startedAt: wall,
      date: toDateKey(wall),
      durationMs: limit,
      targetSec: seconds,
      typed: count,
      correct: count,
      incorrect: 0,
      uncorrected: 0,
      grossWpm: round1(m.grossWpm),
      netWpm: round1(m.grossWpm),
      accuracy: null,
      keyErrors: {},
      keyTotals: {},
    };
    setReward(recordActivity({ session }));
  }, [phase, elapsed, limit, seconds, recordActivity]);

  const onChange = (value: string) => {
    if (phase === 'done') return;
    if (phase === 'idle' && value.length > 0) {
      started.current = { perf: performance.now(), wall: Date.now(), typed: 0 };
      setPhase('running');
    }
    const added = value.length - text.length;
    if (added > 0) {
      started.current.typed += added;
      setTyped(started.current.typed);
    }
    setText(value);
  };

  const reset = () => {
    setText('');
    setTyped(0);
    setPhase('idle');
    setReward(null);
    setFinalMs(0);
  };

  const m = buildMetrics(typed, typed, 0, elapsed);

  return (
    <section aria-label="Free typing" className="space-y-4">
      <dl className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-line bg-surface px-3 py-2">
          <dt className="label">Time left</dt>
          <dd className="text-xl font-bold tabular-nums">{formatClock(limit - elapsed)}</dd>
        </div>
        <div className="rounded-xl border border-line bg-surface px-3 py-2">
          <dt className="label">WPM</dt>
          <dd className="text-xl font-bold tabular-nums">{Math.round(m.grossWpm)}</dd>
        </div>
        <div className="rounded-xl border border-line bg-surface px-3 py-2">
          <dt className="label">Characters</dt>
          <dd className="text-xl font-bold tabular-nums">{typed}</dd>
        </div>
      </dl>
      <label htmlFor="free-text" className="sr-only">
        Free typing area
      </label>
      <textarea
        id="free-text"
        value={text}
        readOnly={phase === 'done'}
        rows={8}
        spellCheck={false}
        onPaste={(e) => e.preventDefault()}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start typing anything. The timer begins with your first character."
        className="w-full rounded-2xl border border-line bg-card p-4 text-lg leading-relaxed"
      />
      {phase === 'done' ? (
        <div className="space-y-4">
          <ResultSummary metrics={m} reward={reward} heading="Free typing results" scored={false} />
          <button type="button" className="btn btn-primary" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" />
            Type again
          </button>
        </div>
      ) : (
        <p className="text-sm text-mute">Free typing measures speed only. There is no target text, so accuracy is not calculated.</p>
      )}
    </section>
  );
}
