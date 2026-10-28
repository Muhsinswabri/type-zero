import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  backspace,
  createEngine,
  elapsedOf,
  finish,
  metricsOf,
  typeChar,
  type EngineOptions,
  type EngineState,
} from '../lib/typingEngine';
import { useClock } from './useTimer';

type Action =
  | { type: 'char'; ch: string; now: number; wall: number }
  | { type: 'back' }
  | { type: 'finish'; now: number }
  | { type: 'reset'; target: string; opts: EngineOptions };

function reducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {
    case 'char':
      return typeChar(state, action.ch, action.now, action.wall);
    case 'back':
      return backspace(state);
    case 'finish':
      return finish(state, action.now);
    case 'reset':
      return createEngine(action.target, action.opts);
  }
}

export interface UseTypingEngineOptions extends EngineOptions {
  /** Reset a running session if the tab is hidden, so time away never counts. */
  interruptOnHide?: boolean;
}

export function useTypingEngine(target: string, options: UseTypingEngineOptions) {
  const { interruptOnHide = true, ...opts } = options;
  const [state, dispatch] = useReducer(reducer, undefined, () => createEngine(target, opts));
  const [interrupted, setInterrupted] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const optsKey = `${opts.allowBackspace}|${opts.stopOnError}|${opts.limitMs}`;
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    dispatch({ type: 'reset', target, opts });
    setInterrupted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, optsKey]);

  const running = state.status === 'running';
  const now = useClock(running);

  // Time limit: end the session at the deadline even if the user stops typing.
  useEffect(() => {
    if (state.status !== 'running' || state.opts.limitMs === null || state.startedAt === null) return;
    if (now - state.startedAt >= state.opts.limitMs) dispatch({ type: 'finish', now });
  }, [now, state]);

  useEffect(() => {
    if (!interruptOnHide) return;
    const onVisibility = () => {
      const s = stateRef.current;
      if (document.visibilityState === 'hidden' && s.status === 'running') {
        dispatch({ type: 'reset', target: s.target, opts: s.opts });
        setInterrupted(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [interruptOnHide]);

  const type = useCallback((ch: string) => {
    setInterrupted(false);
    dispatch({ type: 'char', ch, now: performance.now(), wall: Date.now() });
  }, []);
  const back = useCallback(() => dispatch({ type: 'back' }), []);
  const restart = useCallback((nextTarget?: string) => {
    setInterrupted(false);
    dispatch({ type: 'reset', target: nextTarget ?? stateRef.current.target, opts: stateRef.current.opts });
  }, []);

  const clock = state.status === 'running' ? now : (state.endedAt ?? now);
  const metrics = metricsOf(state, clock);
  const elapsedMs = elapsedOf(state, clock);
  const remainingMs = state.opts.limitMs === null ? null : Math.max(0, state.opts.limitMs - elapsedMs);

  return { state, metrics, elapsedMs, remainingMs, interrupted, type, back, restart };
}

export type TypingEngine = ReturnType<typeof useTypingEngine>;
