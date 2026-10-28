import type { FingerId, LayoutId } from '../types';

export interface KeyDef {
  /** Stable id: the unshifted character for char keys, or a name such as 'Backspace'. */
  id: string;
  /** Text shown on the key. */
  label: string;
  base?: string;
  shift?: string;
  /** Relative width in key units. */
  width: number;
  finger: FingerId;
  name: string;
}

export interface LayoutDef {
  id: LayoutId;
  name: string;
  rows: KeyDef[][];
  /** Pixel-free spacer units either side of the spacebar row. */
  spaceRowPad: [number, number];
}

const char = (base: string, shift: string, finger: FingerId): KeyDef => ({
  id: base,
  label: base.length === 1 && base >= 'a' && base <= 'z' ? base.toUpperCase() : base,
  base,
  shift,
  width: 1,
  finger,
  name: base >= 'a' && base <= 'z' ? base.toUpperCase() : base,
});

const special = (id: string, label: string, width: number, finger: FingerId, name = label): KeyDef => ({
  id,
  label,
  width,
  finger,
  name,
});

const QWERTY_ROWS: KeyDef[][] = [
  [
    char('`', '~', 'lp'),
    char('1', '!', 'lp'),
    char('2', '@', 'lr'),
    char('3', '#', 'lm'),
    char('4', '$', 'li'),
    char('5', '%', 'li'),
    char('6', '^', 'ri'),
    char('7', '&', 'ri'),
    char('8', '*', 'rm'),
    char('9', '(', 'rr'),
    char('0', ')', 'rp'),
    char('-', '_', 'rp'),
    char('=', '+', 'rp'),
    special('Backspace', 'Backspace', 2, 'rp'),
  ],
  [
    special('Tab', 'Tab', 1.5, 'lp'),
    char('q', 'Q', 'lp'),
    char('w', 'W', 'lr'),
    char('e', 'E', 'lm'),
    char('r', 'R', 'li'),
    char('t', 'T', 'li'),
    char('y', 'Y', 'ri'),
    char('u', 'U', 'ri'),
    char('i', 'I', 'rm'),
    char('o', 'O', 'rr'),
    char('p', 'P', 'rp'),
    char('[', '{', 'rp'),
    char(']', '}', 'rp'),
    char('\\', '|', 'rp'),
  ].map((k, i, arr) => (i === arr.length - 1 ? { ...k, width: 1.5 } : k)),
  [
    special('CapsLock', 'Caps', 1.75, 'lp', 'Caps Lock'),
    char('a', 'A', 'lp'),
    char('s', 'S', 'lr'),
    char('d', 'D', 'lm'),
    char('f', 'F', 'li'),
    char('g', 'G', 'li'),
    char('h', 'H', 'ri'),
    char('j', 'J', 'ri'),
    char('k', 'K', 'rm'),
    char('l', 'L', 'rr'),
    char(';', ':', 'rp'),
    char("'", '"', 'rp'),
    special('Enter', 'Enter', 2.25, 'rp'),
  ],
  [
    special('ShiftLeft', 'Shift', 2.25, 'lp', 'Left Shift'),
    char('z', 'Z', 'lp'),
    char('x', 'X', 'lr'),
    char('c', 'C', 'lm'),
    char('v', 'V', 'li'),
    char('b', 'B', 'li'),
    char('n', 'N', 'ri'),
    char('m', 'M', 'ri'),
    char(',', '<', 'rm'),
    char('.', '>', 'rr'),
    char('/', '?', 'rp'),
    special('ShiftRight', 'Shift', 2.75, 'rp', 'Right Shift'),
  ],
  [special('Space', 'Space', 6.25, 'rt', 'Space bar')],
];

export const LAYOUTS: Record<LayoutId, LayoutDef> = {
  qwerty: { id: 'qwerty', name: 'QWERTY (US)', rows: QWERTY_ROWS, spaceRowPad: [4.375, 4.375] },
};

export const FINGER_NAMES: Record<FingerId, string> = {
  lp: 'left pinky',
  lr: 'left ring finger',
  lm: 'left middle finger',
  li: 'left index finger',
  lt: 'left thumb',
  rt: 'right thumb',
  ri: 'right index finger',
  rm: 'right middle finger',
  rr: 'right ring finger',
  rp: 'right pinky',
};

export const LAYOUT_OPTIONS: { id: LayoutId; name: string; available: boolean }[] = [
  { id: 'qwerty', name: 'QWERTY (US)', available: true },
];

/** Home-row, top-row, bottom-row and number-row letter sets for QWERTY. */
export const ROW_KEYS = {
  number: '1234567890'.split(''),
  top: 'qwertyuiop'.split(''),
  home: 'asdfghjkl;'.split(''),
  bottom: 'zxcvbnm,./'.split(''),
} as const;
