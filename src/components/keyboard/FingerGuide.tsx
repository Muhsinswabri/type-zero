import { memo } from 'react';
import { FINGER_NAMES } from '../../data/keyboard';
import type { FingerId } from '../../types';

const LEFT: FingerId[] = ['lp', 'lr', 'lm', 'li', 'lt'];
const RIGHT: FingerId[] = ['rt', 'ri', 'rm', 'rr', 'rp'];
const HEIGHT: Record<FingerId, number> = { lp: 34, lr: 46, lm: 54, li: 46, lt: 28, rt: 28, ri: 46, rm: 54, rr: 46, rp: 34 };

function Hand({ side, fingers, active }: { side: 'Left' | 'Right'; fingers: FingerId[]; active: ReadonlySet<FingerId> }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-end gap-1.5" aria-hidden="true">
        {fingers.map((f) => {
          const on = active.has(f);
          const tone = side === 'Left' ? 'border-hand-l/60 bg-hand-l/15' : 'border-hand-r/60 bg-hand-r/15';
          return (
            <div
              key={f}
              data-finger={f}
              data-active={on || undefined}
              style={{ height: HEIGHT[f] }}
              className={`w-5 rounded-t-full rounded-b-md border-2 transition-colors sm:w-6 ${
                on ? 'border-accent bg-accent shadow-[0_0_0_3px_rgb(var(--c-accent)/0.3)]' : tone
              }`}
            />
          );
        })}
      </div>
      <span className="text-[11px] font-medium text-mute">{side} hand</span>
    </div>
  );
}

function FingerGuideImpl({ fingers, shiftFinger }: { fingers: FingerId[]; shiftFinger?: FingerId | null }) {
  const active = new Set<FingerId>([...fingers, ...(shiftFinger ? [shiftFinger] : [])]);
  const main = fingers.length === 2 ? 'either thumb' : fingers[0] ? FINGER_NAMES[fingers[0]] : null;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8" aria-label="Finger placement guide">
      <div className="flex items-end gap-4 sm:gap-6">
        <Hand side="Left" fingers={LEFT} active={active} />
        <Hand side="Right" fingers={RIGHT} active={active} />
      </div>
      <p className="min-h-5 text-center text-sm text-mute sm:text-left">
        {main ? (
          <>
            Use your <strong className="text-ink">{main}</strong>
            {shiftFinger ? (
              <>
                {' '}
                and hold Shift with your <strong className="text-ink">{FINGER_NAMES[shiftFinger]}</strong>
              </>
            ) : null}
            .
          </>
        ) : (
          'Place your fingers on the home row.'
        )}
      </p>
    </div>
  );
}

export default memo(FingerGuideImpl);
