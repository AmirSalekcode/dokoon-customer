import { isNative } from '@/lib/platform';

/**
 * In-app new-offer sound (KAN-95): a short synthesized two-tone beep through Web Audio, repeated while the
 * alert is open, plus vibration. Browsers allow audio only after a user gesture, so `unlock()` runs on the
 * tap that turns the courier online. Sound with the app closed (push, Android notification) is a separate,
 * still-open decision (Push/sound provider) and the native work of KAN-104.
 */
interface Ctx {
  state: string;
  currentTime: number;
  destination: unknown;
  resume: () => Promise<void>;
  createOscillator: () => {
    type: string;
    frequency: { value: number };
    connect: (n: unknown) => void;
    start: (t?: number) => void;
    stop: (t?: number) => void;
  };
  createGain: () => { gain: { value: number }; connect: (n: unknown) => void };
}

export interface OfferSoundDeps {
  createContext: () => Ctx | null;
  vibrate: (pattern: number[]) => void;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (id: unknown) => void;
}

export const RING_EVERY_MS = 1600;
export const VIBRATION = [300, 120, 300];

function browserDeps(): OfferSoundDeps {
  const w = globalThis as unknown as { AudioContext?: new () => Ctx; webkitAudioContext?: new () => Ctx };
  return {
    createContext: () => {
      const C = w.AudioContext ?? w.webkitAudioContext;
      return C ? new C() : null;
    },
    vibrate: (p) => {
      // The Android vibrator plugin arrives with KAN-104; the WebView's navigator.vibrate is unreliable there.
      if (!isNative() && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')
        navigator.vibrate(p);
    },
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  };
}

export function createOfferSound(deps: OfferSoundDeps = browserDeps()) {
  let ctx: Ctx | null = null;
  let timer: unknown = null;
  let ringing = false;

  function beep() {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.value = 0.35;
    gain.connect(ctx.destination);
    [880, 1175].forEach((f, i) => {
      const osc = ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start(t + i * 0.22);
      osc.stop(t + i * 0.22 + 0.18);
    });
  }

  function ring() {
    timer = null;
    if (!ringing) return;
    beep();
    deps.vibrate(VIBRATION);
    timer = deps.setTimer(ring, RING_EVERY_MS);
  }

  return {
    /** From a user tap (the online switch). Never throws. */
    unlock() {
      try {
        ctx ??= deps.createContext();
        if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => {});
      } catch {
        ctx = null;
      }
    },
    get unlocked() {
      return !!ctx && ctx.state === 'running';
    },
    start() {
      if (ringing) return;
      ringing = true;
      ring();
    },
    stop() {
      ringing = false;
      if (timer !== null) deps.clearTimer(timer);
      timer = null;
    },
    get ringing() {
      return ringing;
    },
  };
}

export type OfferSound = ReturnType<typeof createOfferSound>;
let shared: OfferSound | null = null;
export const offerSound = (): OfferSound => (shared ??= createOfferSound());
/** Tests. */
export const setOfferSound = (s: OfferSound | null) => {
  shared = s;
};
