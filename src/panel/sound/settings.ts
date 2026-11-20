import { create } from 'zustand';
import { readJson, writeJson } from '@/lib/storage';

/** «صدا و هشدار» settings, per device (a kitchen tablet and the manager's phone may differ). */
export interface SoundSettings {
  /** 1..5 (SoundPanel segments). */
  level: number;
  /** Repeat the alert until the order is answered. */
  repeat: boolean;
  /** Vibrate with each alert (phones that support it). */
  vibrate: boolean;
}

export const SOUND_KEY = 'dk-r-sound';
export const DEFAULT_SOUND: SoundSettings = { level: 4, repeat: true, vibrate: true };
export const LEVELS = [1, 2, 3, 4, 5] as const;

const clampLevel = (n: number) =>
  Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : DEFAULT_SOUND.level;

interface SoundState extends SoundSettings {
  set: (patch: Partial<SoundSettings>) => void;
}

export const useSoundSettings = create<SoundState>((set, get) => {
  const saved = readJson<Partial<SoundSettings>>(SOUND_KEY, {});
  return {
    ...DEFAULT_SOUND,
    ...saved,
    level: clampLevel(saved.level ?? DEFAULT_SOUND.level),
    set: (patch) => {
      const { level, repeat, vibrate } = { ...get(), ...patch };
      const next = { level: clampLevel(level), repeat, vibrate };
      writeJson(SOUND_KEY, next);
      set(next);
    },
  };
});

/** Gain per level: perceptually spaced, level 5 = full volume. */
export const gainFor = (level: number) => [0.12, 0.25, 0.45, 0.7, 1][clampLevel(level) - 1];
