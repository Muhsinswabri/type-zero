import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TypingPane from '../components/typing/TypingPane';
import { useTypingEngine } from '../hooks/useTypingEngine';
import { defaultSettings } from '../lib/defaults';

function Harness({ text, limitMs = null, stopOnError = false }: { text: string; limitMs?: number | null; stopOnError?: boolean }) {
  const engine = useTypingEngine(text, { allowBackspace: true, stopOnError, limitMs });
  return (
    <>
      <TypingPane engine={engine} settings={defaultSettings()} clock={limitMs ? 'remaining' : 'elapsed'} />
      <output data-testid="status">{engine.state.status}</output>
      <output data-testid="typed">{engine.state.typed}</output>
    </>
  );
}

const input = () => screen.getByLabelText(/typing input/i);
const press = (key: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(input(), { key, ...init });
const statuses = () => Array.from(document.querySelectorAll('[data-status]')).map((n) => n.getAttribute('data-status'));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TypingPane', () => {
  it('marks typed characters correct or incorrect and updates the cursor', () => {
    render(<Harness text="cat" />);
    press('c');
    press('x');
    expect(statuses()).toEqual(['correct', 'incorrect', 'pending']);
    expect(document.querySelector('[data-cursor="true"]')).toHaveTextContent('t');
    expect(screen.getByTestId('status')).toHaveTextContent('running');
  });

  it('counts each physical keystroke exactly once and ignores key auto-repeat', () => {
    render(<Harness text="aaaa" />);
    press('a');
    press('a', { repeat: true });
    press('a');
    expect(screen.getByTestId('typed')).toHaveTextContent('2');
  });

  it('handles Backspace', () => {
    render(<Harness text="cat" />);
    press('c');
    press('x');
    press('Backspace');
    press('a');
    expect(statuses()).toEqual(['correct', 'correct', 'pending']);
  });

  it('does not treat keyboard shortcuts or modifier keys as typing', () => {
    render(<Harness text="cat" />);
    press('c', { ctrlKey: true });
    press('Shift');
    press('Tab');
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
  });

  it('finishes when the text is complete', () => {
    render(<Harness text="hi" />);
    press('h');
    press('i');
    expect(screen.getByTestId('status')).toHaveTextContent('finished');
    expect(screen.getByText(/^Finished\./)).toBeInTheDocument();
  });

  it('holds the cursor on a mistake in stop-on-error mode', () => {
    render(<Harness text="ab" stopOnError />);
    press('x');
    expect(statuses()).toEqual(['pending', 'pending']);
    press('a');
    expect(statuses()).toEqual(['correct', 'pending']);
  });

  it('starts the timer on the first keystroke and ends exactly at the limit', () => {
    render(<Harness text={'word '.repeat(50)} limitMs={5000} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    press('w');
    expect(screen.getByText('0:05')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('status')).toHaveTextContent('running');
    act(() => {
      vi.advanceTimersByTime(3200);
    });
    expect(screen.getByTestId('status')).toHaveTextContent('finished');
    press('o');
    expect(screen.getByTestId('typed')).toHaveTextContent('1');
  });

  it('stops its timer when unmounted', () => {
    const { unmount } = render(<Harness text={'word '.repeat(50)} limitMs={5000} />);
    press('w');
    const before = vi.getTimerCount();
    expect(before).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('highlights the expected key and the matching finger on the on-screen keyboard', () => {
    render(<Harness text="fj" />);
    expect(document.querySelector('[data-key="f"]')).toHaveAttribute('data-state', 'next');
    press('f');
    expect(document.querySelector('[data-key="j"]')).toHaveAttribute('data-state', 'next');
    expect(document.querySelector('[data-finger="ri"]')).toHaveAttribute('data-active', 'true');
  });

  it('asks for the opposite-hand Shift key on capital letters', () => {
    render(<Harness text="A" />);
    expect(document.querySelector('[data-key="a"]')).toHaveAttribute('data-state', 'next');
    expect(document.querySelector('[data-key="ShiftRight"]')).toHaveAttribute('data-state', 'next');
  });

  it('supports on-screen key clicks', () => {
    render(<Harness text="ab" />);
    fireEvent.click(document.querySelector('[data-key="a"]') as Element);
    expect(screen.getByTestId('typed')).toHaveTextContent('1');
  });
});
