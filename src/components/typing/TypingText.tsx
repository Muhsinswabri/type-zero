import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import type { ErrorStyle } from '../../types';

interface WordProps {
  text: string;
  start: number;
  typed: string;
  /** Index of the cursor inside this word, or -1. */
  cursor: number;
  errorStyle: ErrorStyle;
}

const WordView = memo(function WordView({ text, start, typed, cursor, errorStyle }: WordProps) {
  return (
    <span className="whitespace-nowrap">
      {Array.from(text).map((ch, i) => {
        let cls = 'text-mute';
        let status = 'pending';
        if (i < typed.length) {
          if (typed[i] === ch) {
            cls = 'text-ink';
            status = 'correct';
          } else {
            status = 'incorrect';
            cls =
              errorStyle === 'highlight'
                ? 'rounded bg-bad/25 text-bad underline decoration-2 underline-offset-4'
                : 'text-bad underline decoration-2 underline-offset-4';
          }
        }
        const isCursor = i === cursor;
        if (isCursor) cls += ' rounded-sm bg-accent/25 shadow-[inset_0_-2px_0_rgb(var(--c-accent))]';
        return (
          <span key={start + i} data-status={status} data-cursor={isCursor || undefined} className={cls}>
            {ch === ' ' ? ' ' : ch}
          </span>
        );
      })}
    </span>
  );
});

/** Splits the passage into words (with trailing spaces) so a keystroke only re-renders one word. */
function tokenize(target: string): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = [];
  const re = /\S+\s*|\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(target)) !== null) out.push({ text: m[0], start: m.index });
  return out;
}

interface TypingTextProps {
  target: string;
  input: string;
  errorStyle: ErrorStyle;
  /** Number of visible text lines. */
  lines?: number;
  label?: string;
}

function TypingTextImpl({ target, input, errorStyle, lines = 3, label = 'Text to type' }: TypingTextProps) {
  const words = useMemo(() => tokenize(target), [target]);
  const box = useRef<HTMLDivElement>(null);
  const cursorIndex = input.length;

  // Keep the active line in the middle of the box as the user types.
  useLayoutEffect(() => {
    const el = box.current;
    const cursor = el?.querySelector<HTMLElement>('[data-cursor="true"]');
    if (!el || !cursor) return;
    const lineHeight = cursor.offsetHeight || 36;
    el.scrollTop = Math.max(0, cursor.offsetTop - lineHeight);
  }, [cursorIndex, target]);

  return (
    <div
      ref={box}
      className="typing-text relative overflow-hidden text-xl leading-[2.4rem] sm:text-2xl sm:leading-[2.7rem]"
      style={{ height: `calc(${lines} * 2.7rem)` }}
    >
      <p className="sr-only">
        {label}: {target}
      </p>
      <div className="flex flex-wrap" aria-hidden="true">
        {words.map((w) => {
          const end = w.start + w.text.length;
          const inWord = cursorIndex >= w.start && cursorIndex < end;
          return (
            <WordView
              key={w.start}
              text={w.text}
              start={w.start}
              typed={input.slice(w.start, end)}
              cursor={inWord ? cursorIndex - w.start : -1}
              errorStyle={errorStyle}
            />
          );
        })}
      </div>
    </div>
  );
}

export default memo(TypingTextImpl);
