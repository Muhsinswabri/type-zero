import { useEffect, useState } from 'react';

/**
 * Returns a monotonic timestamp (performance.now) that refreshes every `intervalMs` while `active`.
 * The interval is cleared when the clock stops or the component unmounts.
 */
export function useClock(active: boolean, intervalMs = 100): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!active) return;
    setNow(performance.now());
    const id = window.setInterval(() => setNow(performance.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
