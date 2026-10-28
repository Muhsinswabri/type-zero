let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** A very short, quiet blip. Correct keys are higher-pitched than mistakes. */
export function playKeySound(ok: boolean): void {
  const c = getContext();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = ok ? 'triangle' : 'square';
    osc.frequency.value = ok ? 660 : 180;
    const t = c.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(ok ? 0.05 : 0.04, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  } catch {
    /* sound is optional */
  }
}
