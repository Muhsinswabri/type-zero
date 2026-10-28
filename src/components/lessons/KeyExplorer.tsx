import { useState } from 'react';
import { FINGER_NAMES, type KeyDef } from '../../data/keyboard';
import type { FingerId, LayoutId } from '../../types';
import FingerGuide from '../keyboard/FingerGuide';
import Keyboard, { type ColorMode } from '../keyboard/Keyboard';

interface KeyExplorerProps {
  layoutId: LayoutId;
  colorMode: ColorMode;
  highlightChars?: ReadonlySet<string>;
  enabledChars?: ReadonlySet<string> | null;
}

/** An interactive keyboard: click a key to see its name and the finger that presses it. */
export default function KeyExplorer({ layoutId, colorMode, highlightChars, enabledChars = null }: KeyExplorerProps) {
  const [selected, setSelected] = useState<KeyDef | null>(null);
  const fingers: FingerId[] = selected ? (selected.id === 'Space' ? ['lt', 'rt'] : [selected.finger]) : [];

  return (
    <div className="card space-y-4 p-3 sm:p-4">
      <Keyboard
        layoutId={layoutId}
        colorMode={colorMode}
        highlightChars={highlightChars}
        enabledChars={enabledChars}
        selectedKeyId={selected?.id ?? null}
        onSelect={setSelected}
      />
      <p className="min-h-5 text-center text-sm text-mute" aria-live="polite">
        {selected ? (
          <>
            <strong className="text-ink">{selected.name}</strong> is pressed by your{' '}
            <strong className="text-ink">{selected.id === 'Space' ? 'either thumb' : FINGER_NAMES[selected.finger]}</strong>.
          </>
        ) : (
          'Click any key to see which finger presses it.'
        )}
      </p>
      <FingerGuide fingers={fingers} />
    </div>
  );
}
