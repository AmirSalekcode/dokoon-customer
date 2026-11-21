import { create } from 'zustand';
import { panelApi, type PanelApi } from '../api/client';
import { businessError } from '../api/errors';
import type { RestaurantSettings } from '../api/types';
import { showFullPageError } from '../errors/fullPage';

interface SettingsState {
  settings: RestaurantSettings | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** `GET /r/settings`; quiet = no full-page error (a screen that only needs a hint from it). */
  load: (api?: PanelApi, opts?: { quiet?: boolean }) => Promise<void>;
  /** `PUT /r/settings`; resolves null when saved, else the message to show. */
  save: (next: RestaurantSettings, api?: PanelApi) => Promise<string | null>;
  reset: () => void;
}

/** Delivery & payment settings of the restaurant (allowCash, allowExtras, default prep range). */
export const useSettings = create<SettingsState>((set, get) => ({
  settings: null,
  status: 'idle',

  load: async (api = panelApi(), opts = {}) => {
    set({ status: 'loading' });
    try {
      const { data, error } = await api.GET('/r/settings');
      if (error !== undefined || !data) throw error ?? new Error('empty settings');
      set({ settings: data, status: 'ready' });
    } catch (e) {
      set({ status: 'error' });
      if (!opts.quiet) showFullPageError(e, () => void get().load(api));
    }
  },

  save: async (next, api = panelApi()) => {
    // acceptTimeoutSec is read-only (server value).
    const { acceptTimeoutSec: _ro, ...body } = next;
    try {
      const { error } = await api.PUT('/r/settings', { body });
      if (error !== undefined) return businessError(error)?.message ?? '';
      set({ settings: { ...get().settings, ...body }, status: 'ready' });
      return null;
    } catch (e) {
      showFullPageError(e, () => void get().save(next, api));
      return 'تنظیمات ذخیره نشد؛ دوباره تلاش کنید';
    }
  },

  reset: () => set({ settings: null, status: 'idle' }),
}));

/** Default prep range bounds (contract: 5..120), step 5. */
export const ETA_MIN = 5;
export const ETA_MAX = 120;
const ETA_STEP = 5;

/**
 * One ± step of the default prep range that never leaves 5..120 and keeps max ≥ min: raising the
 * minimum past the maximum pushes the maximum along, lowering the maximum below the minimum pulls it down.
 */
export function stepEta(min: number, max: number, which: 'min' | 'max', dir: 1 | -1) {
  const clamp = (v: number) => Math.min(ETA_MAX, Math.max(ETA_MIN, v));
  if (which === 'min') {
    const etaMin = clamp(min + dir * ETA_STEP);
    return { etaMin, etaMax: Math.max(max, etaMin) };
  }
  const etaMax = clamp(max + dir * ETA_STEP);
  return { etaMin: Math.min(min, etaMax), etaMax };
}
