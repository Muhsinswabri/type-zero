import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ACHIEVEMENT_BY_ID } from '../data/achievements';
import { createDefaultState } from '../lib/defaults';
import { applyActivity, type ActivityInput } from '../lib/progression';
import { clearStorage, getStorage, loadState, saveState } from '../lib/storage';
import { buildExport } from '../lib/validation';
import type { AppState, DailyGoal, LayoutId, RewardSummary, Settings, StartLevel } from '../types';

export interface Toast {
  id: number;
  title: string;
  body?: string;
}

interface ProgressApi {
  state: AppState;
  /** False when progress cannot be saved (storage blocked, full, or from a newer app version). */
  persistent: boolean;
  notice: string | null;
  dismissNotice: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  completeOnboarding: (opts: { startLevel: StartLevel; dailyGoalMinutes: DailyGoal; layout: LayoutId }) => void;
  recordActivity: (input: ActivityInput) => RewardSummary;
  resetProgress: (includeSettings: boolean) => void;
  importState: (next: AppState) => void;
  exportJson: () => string;
  toasts: Toast[];
  dismissToast: (id: number) => void;
}

const ProgressContext = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [init] = useState(() => {
    const storage = getStorage();
    return { storage, ...loadState(storage) };
  });
  const storageRef = useRef(init.storage);
  // Never write over data that this app version could not understand.
  const canWriteRef = useRef(init.storage !== null && init.persistent);

  const [state, setState] = useState<AppState>(init.state);
  const stateRef = useRef(state);
  const [persistent, setPersistent] = useState(init.persistent);
  const [notice, setNotice] = useState<string | null>(init.notice);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const commit = useCallback((next: AppState) => {
    stateRef.current = next;
    setState(next);
    if (!canWriteRef.current) return;
    const result = saveState(next, storageRef.current);
    setPersistent(result.ok);
    if (!result.ok) {
      setNotice(
        result.reason === 'quota'
          ? 'Browser storage is full, so recent progress could not be saved. Export your data from Settings to keep a copy.'
          : 'Progress could not be saved to this browser. Your current session still works, but export your data from Settings to keep a copy.',
      );
    } else if (result.trimmed) {
      setNotice('Browser storage is nearly full, so older session history was trimmed from the saved copy. Lifetime stats are kept.');
    }
  }, []);

  const pushToast = useCallback((title: string, body?: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, title, body }]);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = state.settings.theme;
    root.dataset.motion = state.settings.reducedMotion ? 'reduce' : 'full';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.settings.theme === 'dark' ? '#0B0D12' : '#F7F8FA');
  }, [state.settings.theme, state.settings.reducedMotion]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => commit({ ...stateRef.current, settings: { ...stateRef.current.settings, ...patch } }),
    [commit],
  );

  const completeOnboarding = useCallback<ProgressApi['completeOnboarding']>(
    ({ startLevel, dailyGoalMinutes, layout }) => {
      const cur = stateRef.current;
      commit({ ...cur, onboarded: true, startLevel, settings: { ...cur.settings, dailyGoalMinutes, layout } });
    },
    [commit],
  );

  const recordActivity = useCallback(
    (input: ActivityInput): RewardSummary => {
      const { state: next, reward } = applyActivity(stateRef.current, input);
      if (!reward.recorded) return reward;
      commit(next);
      if (reward.levelAfter > reward.levelBefore) pushToast(`Level ${reward.levelAfter} reached`, 'Keep going!');
      for (const id of reward.achievements) {
        const a = ACHIEVEMENT_BY_ID[id];
        if (a) pushToast('Achievement unlocked', a.name);
      }
      if (reward.challengeCompleted) pushToast('Daily challenge complete');
      return reward;
    },
    [commit, pushToast],
  );

  const resetProgress = useCallback(
    (includeSettings: boolean) => {
      const fresh = createDefaultState();
      const cur = stateRef.current;
      const next: AppState = includeSettings
        ? fresh
        : { ...fresh, settings: cur.settings, onboarded: cur.onboarded, startLevel: cur.startLevel };
      if (includeSettings) clearStorage(storageRef.current);
      canWriteRef.current = storageRef.current !== null;
      commit(next);
    },
    [commit],
  );

  const importState = useCallback(
    (next: AppState) => {
      canWriteRef.current = storageRef.current !== null;
      commit(next);
    },
    [commit],
  );

  const exportJson = useCallback(() => JSON.stringify(buildExport(stateRef.current), null, 2), []);

  const value = useMemo<ProgressApi>(
    () => ({
      state,
      persistent,
      notice,
      dismissNotice: () => setNotice(null),
      updateSettings,
      completeOnboarding,
      recordActivity,
      resetProgress,
      importState,
      exportJson,
      toasts,
      dismissToast,
    }),
    [state, persistent, notice, updateSettings, completeOnboarding, recordActivity, resetProgress, importState, exportJson, toasts, dismissToast],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
