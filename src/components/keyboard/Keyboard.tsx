import { memo, useEffect, useState, type CSSProperties } from 'react';
import { LAYOUTS, type KeyDef } from '../../data/keyboard';
import { handOf, lookupChar, shiftKeyFor } from '../../lib/fingerMapping';
import type { FingerId, LayoutId } from '../../types';

export type ColorMode = 'none' | 'hand' | 'finger';

export interface KeyFlash {
  /** The character whose key should flash. */
  char: string;
  ok: boolean;
  seq: number;
}

interface KeyboardProps {
  layoutId?: LayoutId;
  /** Expected next character: its key (and Shift, if needed) is highlighted. */
  nextChar?: string | null;
  /** Ids of keys physically held down right now. */
  pressedKeyIds?: ReadonlySet<string>;
  flash?: KeyFlash | null;
  /** If set, character keys whose character is not in this set are dimmed. */
  enabledChars?: ReadonlySet<string> | null;
  /** Keys outlined as the focus of the current lesson. */
  highlightChars?: ReadonlySet<string>;
  colorMode?: ColorMode;
  selectedKeyId?: string | null;
  /** Called with the typed character, or 'Backspace', when an on-screen key is clicked. */
  onKey?: (value: string) => void;
  /** Called with the key definition on click (used by the explorer). */
  onSelect?: (key: KeyDef) => void;
}

const FINGER_HUE: Record<FingerId, number> = {
  lp: 330,
  lr: 270,
  lm: 215,
  li: 175,
  lt: 140,
  rt: 140,
  ri: 90,
  rm: 50,
  rr: 25,
  rp: 0,
};

function zoneStyle(key: KeyDef, mode: ColorMode): CSSProperties | undefined {
  if (mode === 'finger') return { backgroundColor: `hsl(${FINGER_HUE[key.finger]} 70% 55% / 0.22)` };
  if (mode === 'hand' && key.id !== 'Space') {
    const color = handOf(key.finger) === 'left' ? 'var(--c-left)' : 'var(--c-right)';
    return { backgroundColor: `rgb(${color} / 0.12)` };
  }
  return undefined;
}

function KeyboardImpl({
  layoutId = 'qwerty',
  nextChar = null,
  pressedKeyIds,
  flash = null,
  enabledChars = null,
  highlightChars,
  colorMode = 'hand',
  selectedKeyId = null,
  onKey,
  onSelect,
}: KeyboardProps) {
  const layout = LAYOUTS[layoutId];
  const [stickyShift, setStickyShift] = useState(false);
  const [flashing, setFlashing] = useState<{ keyId: string; shiftId: string | null; ok: boolean } | null>(null);

  const next = nextChar ? lookupChar(layoutId, nextChar) : null;
  const nextShiftId = nextChar ? shiftKeyFor(layoutId, nextChar) : null;
  const nextIds = new Set<string>();
  if (next) nextIds.add(next.key.id);
  if (nextShiftId) nextIds.add(nextShiftId);

  const flashSeq = flash?.seq;
  useEffect(() => {
    if (!flash) return;
    const hit = lookupChar(layoutId, flash.char);
    if (!hit) return;
    setFlashing({ keyId: hit.key.id, shiftId: hit.shift ? shiftKeyFor(layoutId, flash.char) : null, ok: flash.ok });
    const id = window.setTimeout(() => setFlashing(null), 180);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashSeq, layoutId]);

  const press = (key: KeyDef) => {
    onSelect?.(key);
    if (!onKey) return;
    if (key.id === 'ShiftLeft' || key.id === 'ShiftRight') {
      setStickyShift((s) => !s);
      return;
    }
    if (key.id === 'Backspace') return onKey('Backspace');
    if (key.id === 'Space') return onKey(' ');
    if (key.base === undefined) return;
    onKey(stickyShift ? (key.shift ?? key.base) : key.base);
    setStickyShift(false);
  };

  const renderKey = (key: KeyDef) => {
    const isChar = key.base !== undefined;
    const isShift = key.id === 'ShiftLeft' || key.id === 'ShiftRight';
    const inSet = (set: ReadonlySet<string>) => set.has(key.base as string) || (key.shift !== undefined && set.has(key.shift));
    const disabled = enabledChars !== null && isChar && !inSet(enabledChars);
    const isNext = nextIds.has(key.id);
    const flashState = flashing && (flashing.keyId === key.id || flashing.shiftId === key.id) ? (flashing.ok ? 'good' : 'bad') : null;
    const pressed = pressedKeyIds?.has(key.id) || (isShift && stickyShift);
    const highlighted = isChar && highlightChars !== undefined && inSet(highlightChars);
    const selected = selectedKeyId === key.id;

    let state = 'border-line bg-surface text-ink';
    if (disabled) state = 'border-line/60 bg-surface/40 text-mute/50';
    if (highlighted) state += ' !border-accent';
    if (pressed) state = 'border-ink bg-ink/25 text-ink';
    if (isNext) state = 'border-accent bg-accent text-accent-ink font-bold shadow-[0_0_0_2px_rgb(var(--c-accent)/0.35)]';
    if (flashState === 'good') state = 'border-good bg-good text-accent-ink font-bold';
    if (flashState === 'bad') state = 'border-bad bg-bad text-bad-ink font-bold';
    if (selected) state += ' ring-2 ring-accent';

    const showShifted = key.shift !== undefined && key.base !== undefined && !(key.base >= 'a' && key.base <= 'z');
    const useZone = !disabled && !isNext && !pressed && !flashState;

    return (
      <button
        key={key.id}
        type="button"
        tabIndex={-1}
        data-key={key.id}
        data-state={isNext ? 'next' : flashState ?? (pressed ? 'pressed' : disabled ? 'disabled' : 'default')}
        aria-label={key.name}
        aria-disabled={disabled || undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => press(key)}
        style={{ flexGrow: key.width, flexBasis: 0, ...(useZone ? zoneStyle(key, colorMode) : {}) }}
        className={`relative flex h-9 min-w-0 select-none items-center justify-center rounded-md border text-[10px] font-medium transition-colors sm:h-11 sm:text-sm lg:h-12 ${state}`}
      >
        {showShifted ? <span className="absolute left-1 top-0.5 text-[8px] leading-none opacity-70 sm:text-[10px]">{key.shift}</span> : null}
        <span className={showShifted ? 'mt-1.5' : ''}>{key.label}</span>
        {key.id === 'f' || key.id === 'j' ? (
          <span aria-hidden="true" className="absolute bottom-1 h-0.5 w-3 rounded bg-current opacity-60" />
        ) : null}
      </button>
    );
  };

  return (
    <div role="group" aria-label="On-screen keyboard" className="flex w-full flex-col gap-1 sm:gap-1.5">
      {layout.rows.map((row, i) => (
        <div key={i} className="flex w-full gap-1 sm:gap-1.5">
          {i === layout.rows.length - 1 ? <div style={{ flexGrow: layout.spaceRowPad[0], flexBasis: 0 }} aria-hidden="true" /> : null}
          {row.map(renderKey)}
          {i === layout.rows.length - 1 ? <div style={{ flexGrow: layout.spaceRowPad[1], flexBasis: 0 }} aria-hidden="true" /> : null}
        </div>
      ))}
    </div>
  );
}

export default memo(KeyboardImpl);
