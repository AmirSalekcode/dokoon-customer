import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSoundEngine, REPEAT_GAP_MS, VIBRATION, type AudioCtxLike, type SoundDeps } from './engine';
import { DEFAULT_SOUND, gainFor, SOUND_KEY, useSoundSettings } from './settings';

// KAN-61: sound service — unlock on a tap, repeat until answered, mute, levels, vibration (D-98).
interface Played {
  kind: 'buffer' | 'beep';
  gain: { value: number };
  stopped: boolean;
}

function fakeCtx(opts: { resumeTo?: string } = {}) {
  const played: Played[] = [];
  let state = 'suspended';
  const ctx: AudioCtxLike = {
    get state() {
      return state;
    },
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => {
      state = opts.resumeTo ?? 'running';
    }),
    decodeAudioData: vi.fn(async () => ({ duration: 3.2 })),
    createGain: () => ({ gain: { value: 0 }, connect: () => undefined }),
    createBufferSource: () => {
      const p = { kind: 'buffer' as const, gain: { value: 0 }, stopped: false };
      return {
        buffer: null,
        connect: (g: unknown) => {
          p.gain = (g as { gain: { value: number } }).gain;
        },
        start: () => played.push(p),
        stop: () => {
          p.stopped = true;
        },
      };
    },
    createOscillator: () => {
      const p = { kind: 'beep' as const, gain: { value: 0 }, stopped: false };
      return {
        type: '',
        frequency: { value: 0 },
        connect: (g: unknown) => {
          p.gain = (g as { gain: { value: number } }).gain;
        },
        start: () => played.push(p),
        stop: () => {
          p.stopped = true;
        },
      };
    },
  };
  return { ctx, played };
}

function setup(o: { fetchOk?: boolean; noAudio?: boolean; resumeTo?: string } = {}) {
  const { ctx, played } = fakeCtx(o);
  const timers: { fn: () => void; ms: number; id: number }[] = [];
  let seq = 0;
  const deps: SoundDeps = {
    createContext: vi.fn(() => (o.noAudio ? null : ctx)),
    fetchImpl: vi.fn(async () =>
      o.fetchOk === false ? new Response('', { status: 404 }) : new Response(new Uint8Array(8)),
    ) as unknown as typeof fetch,
    vibrate: vi.fn(() => true),
    setTimer: (fn, ms) => {
      const id = ++seq;
      timers.push({ fn, ms, id });
      return id;
    },
    clearTimer: (id) => {
      const i = timers.findIndex((t) => t.id === id);
      if (i >= 0) timers.splice(i, 1);
    },
    url: '/sounds/new-order.wav',
  };
  const fire = () => timers.shift()!.fn();
  return { engine: createSoundEngine(deps), deps, played, timers, fire, ctx };
}

beforeEach(() => {
  localStorage.clear();
  useSoundSettings.setState({ ...DEFAULT_SOUND });
});

describe('unlock (the «شروع شیفت» tap)', () => {
  it('creates and resumes the AudioContext, loads our sound and plays the test chime', async () => {
    const t = setup();
    expect(await t.engine.unlock()).toBe(true);
    expect(t.ctx.resume).toHaveBeenCalled();
    expect(t.deps.fetchImpl).toHaveBeenCalledWith('/sounds/new-order.wav');
    expect(t.played).toHaveLength(1);
    expect(t.played[0].kind).toBe('buffer');
    expect(t.engine.unlocked).toBe(true);
  });

  it('no Web Audio → false (the shift screen then warns)', async () => {
    expect(await setup({ noAudio: true }).engine.unlock()).toBe(false);
  });

  it('a browser that keeps audio suspended → false', async () => {
    expect(await setup({ resumeTo: 'suspended' }).engine.unlock()).toBe(false);
  });

  it('if the file cannot load it falls back to a synthesized beep', async () => {
    const t = setup({ fetchOk: false });
    await t.engine.unlock();
    expect(t.played[0].kind).toBe('beep');
  });
});

describe('alert', () => {
  it('rings with vibration and repeats after the sound + gap until stopped', async () => {
    const t = setup();
    await t.engine.unlock({ test: false });
    t.engine.startAlert();
    expect(t.played).toHaveLength(1);
    expect(t.deps.vibrate).toHaveBeenCalledWith(VIBRATION);
    expect(t.timers[0].ms).toBe(3200 + REPEAT_GAP_MS);
    t.fire();
    t.fire();
    expect(t.played).toHaveLength(3);
    t.engine.startAlert(); // a second order while ringing: no double ring
    expect(t.played).toHaveLength(3);
    t.engine.stopAlert();
    expect(t.timers).toHaveLength(0);
    expect(t.played.at(-1)!.stopped).toBe(true);
    expect(t.engine.alerting).toBe(false);
  });

  it('repeat off → rings once', async () => {
    useSoundSettings.getState().set({ repeat: false });
    const t = setup();
    await t.engine.unlock({ test: false });
    t.engine.startAlert();
    expect(t.timers).toHaveLength(0);
  });

  it('vibration off → no vibration', async () => {
    useSoundSettings.getState().set({ vibrate: false });
    const t = setup();
    await t.engine.unlock({ test: false });
    t.engine.startAlert();
    expect(t.deps.vibrate).not.toHaveBeenCalled();
  });

  it('mute silences this alert but keeps it alive (the order timer continues)', async () => {
    const t = setup();
    await t.engine.unlock({ test: false });
    t.engine.startAlert();
    t.engine.mute();
    expect(t.played[0].stopped).toBe(true);
    t.fire();
    expect(t.played).toHaveLength(1);
    expect(t.engine.alerting).toBe(true);
    t.engine.stopAlert();
    t.engine.startAlert(); // the next order rings again
    expect(t.played).toHaveLength(2);
  });
});

describe('levels', () => {
  it('five levels, persisted per device, applied as gain (also live)', async () => {
    const t = setup();
    await t.engine.unlock({ test: false });
    useSoundSettings.getState().set({ level: 2 });
    t.engine.startAlert();
    expect(t.played[0].gain.value).toBe(gainFor(2));
    useSoundSettings.getState().set({ level: 5 });
    t.engine.applyLevel();
    expect(t.played[0].gain.value).toBe(1);
    expect(JSON.parse(localStorage.getItem(SOUND_KEY)!)).toMatchObject({ level: 5 });
  });

  it('levels are clamped to 1..5', () => {
    useSoundSettings.getState().set({ level: 9 });
    expect(useSoundSettings.getState().level).toBe(5);
    useSoundSettings.getState().set({ level: 0 });
    expect(useSoundSettings.getState().level).toBe(1);
    expect(gainFor(1)).toBeLessThan(gainFor(3));
  });
});
