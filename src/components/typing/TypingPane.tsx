import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Keyboard as KeyboardIcon, TriangleAlert } from 'lucide-react';
import { formatClock } from '../../lib/dates';
import { fingersFor, keyIdFromEvent, shiftKeyFor } from '../../lib/fingerMapping';
import { playKeySound } from '../../lib/sound';
import { isPrintable } from '../../lib/typingEngine';
import type { TypingEngine } from '../../hooks/useTypingEngine';
import type { FingerId, Settings } from '../../types';
import FingerGuide from '../keyboard/FingerGuide';
import Keyboard, { type ColorMode } from '../keyboard/Keyboard';
import TypingText from './TypingText';

const SENTINEL = '​';

interface TypingPaneProps {
  engine: TypingEngine;
  settings: Settings;
  clock: 'remaining' | 'elapsed';
  enabledChars?: ReadonlySet<string> | null;
  highlightChars?: ReadonlySet<string>;
  lines?: number;
  /** Rendered between the text and the keyboard (for example finished-state controls). */
  children?: ReactNode;
  hideKeyboard?: boolean;
}

function matchesWide(): boolean {
  try {
    return typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 640px)').matches;
  } catch {
    return true;
  }
}

export default function TypingPane({
  engine,
  settings,
  clock,
  enabledChars = null,
  highlightChars,
  lines = 3,
  children,
  hideKeyboard = false,
}: TypingPaneProps) {
  const { state, metrics } = engine;
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());
  const [showKeyboard, setShowKeyboard] = useState(matchesWide);

  const finished = state.status === 'finished';
  const nextChar = !finished && state.input.length < state.target.length ? state.target[state.input.length] : null;

  // Return focus to the typing input whenever a fresh session starts (mount, restart, new text).
  const idle = state.status === 'idle';
  useEffect(() => {
    if (idle) inputRef.current?.focus();
  }, [idle, state.target]);

  const lastKey = state.lastKey;
  useEffect(() => {
    if (settings.sound && lastKey) playKeySound(lastKey.ok);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKey?.seq]);

  const setHeld = (id: string | null, down: boolean) => {
    if (!id) return;
    setPressed((prev) => {
      if (prev.has(id) === down) return prev;
      const next = new Set(prev);
      if (down) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    setHeld(keyIdFromEvent(settings.layout, e), true);
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      engine.back();
    } else if (e.key.length === 1) {
      // Printable keys are handled here once; key auto-repeat is ignored so a held key is one keystroke.
      e.preventDefault();
      if (!e.repeat) engine.type(e.key);
    }
  };

  // Fallback for software keyboards and IMEs that do not report a usable `key`.
  const onInput = (e: FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const value = el.value;
    el.value = SENTINEL;
    if (value === '') {
      engine.back();
      return;
    }
    for (const ch of Array.from(value.split(SENTINEL).join(''))) if (isPrintable(ch)) engine.type(ch);
  };

  const fingers: FingerId[] = nextChar ? fingersFor(settings.layout, nextChar) : [];
  const shiftId = nextChar ? shiftKeyFor(settings.layout, nextChar) : null;
  const shiftFinger: FingerId | null = shiftId === 'ShiftRight' ? 'rp' : shiftId === 'ShiftLeft' ? 'lp' : null;
  const colorMode: ColorMode = settings.fingerGuidance ? 'hand' : 'none';

  const shownMs = clock === 'remaining' && engine.remainingMs !== null ? engine.remainingMs : engine.elapsedMs;

  return (
    <section aria-label="Typing exercise" className="space-y-4">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={clock === 'remaining' ? 'Time left' : 'Time'} value={formatClock(shownMs)} />
        <Stat label="WPM" value={String(Math.round(metrics.netWpm))} />
        <Stat label="Accuracy" value={`${Math.round(metrics.accuracy)}%`} />
        <Stat label="Mistakes" value={String(metrics.incorrect)} />
      </dl>

      <div className={`card relative p-4 sm:p-6 ${focused ? 'ring-2 ring-accent/60' : ''}`}>
        <TypingText target={state.target} input={state.input} errorStyle={settings.errorStyle} lines={lines} />
        <input
          ref={inputRef}
          aria-label="Typing input. Type the text shown above."
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
          defaultValue={SENTINEL}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={onKeyDown}
          onKeyUp={(e) => setHeld(keyIdFromEvent(settings.layout, e), false)}
          onInput={onInput}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setPressed(new Set());
          }}
        />
        {!focused && !finished ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-bg/70 backdrop-blur-[2px]">
            <span className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-medium">
              Click here or tap to focus, then start typing
            </span>
          </div>
        ) : null}
      </div>

      <p role="status" className="sr-only">
        {finished ? `Finished. ${Math.round(metrics.accuracy)} percent accuracy, ${Math.round(metrics.netWpm)} words per minute.` : ''}
      </p>

      {engine.interrupted ? (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-mute">
          <TriangleAlert size={16} aria-hidden="true" className="text-bad" />
          This session was interrupted because the tab was hidden, so it was restarted and nothing was saved.
        </p>
      ) : null}

      {children}

      {!hideKeyboard ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-mute sm:hidden">A physical keyboard is recommended for touch-typing practice.</p>
            <button
              type="button"
              className="btn btn-ghost ml-auto !px-2 !py-1 text-xs"
              aria-pressed={showKeyboard}
              onClick={() => setShowKeyboard((v) => !v)}
            >
              <KeyboardIcon size={14} aria-hidden="true" />
              {showKeyboard ? 'Hide keyboard' : 'Show keyboard'}
            </button>
          </div>
          {showKeyboard ? (
            <div className="card space-y-4 p-3 sm:p-4">
              <Keyboard
                layoutId={settings.layout}
                nextChar={nextChar}
                pressedKeyIds={pressed}
                flash={lastKey ? { char: lastKey.ok ? lastKey.expected : lastKey.typed, ok: lastKey.ok, seq: lastKey.seq } : null}
                enabledChars={enabledChars}
                highlightChars={highlightChars}
                colorMode={colorMode}
                onKey={(v) => {
                  if (v === 'Backspace') engine.back();
                  else engine.type(v);
                  inputRef.current?.focus();
                }}
              />
              {settings.fingerGuidance ? <FingerGuide fingers={fingers} shiftFinger={shiftFinger} /> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2">
      <dt className="label">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
