import { create } from 'zustand';
import { readJson, writeJson } from '@/lib/storage';
import type { RestaurantStatus } from './types';

/** Own key: a manager may also use the customer app in the same browser (`dk-session`). */
export const PANEL_SESSION_KEY = 'dk-r-session';

interface Persisted {
  accessToken: string | null;
  refreshToken: string | null;
  /** Registration status from the last auth response (routes login → shift or reg-status, KAN-59). */
  status: RestaurantStatus | null;
}

export interface PanelSessionState extends Persisted {
  setSession: (s: { accessToken: string; refreshToken: string; status?: RestaurantStatus | null }) => void;
  clear: () => void;
}

const empty: Persisted = { accessToken: null, refreshToken: null, status: null };

/**
 * Restaurant session tokens (localStorage in the PWA; the Android app moves them to the Keystore,
 * D-38 / KAN-72). Several devices may be signed in at once (D-96).
 */
export const usePanelSession = create<PanelSessionState>((set, get) => ({
  ...readJson<Persisted>(PANEL_SESSION_KEY, empty),
  setSession: ({ accessToken, refreshToken, status }) => {
    const next: Persisted = {
      accessToken,
      refreshToken,
      status: status === undefined ? get().status : status,
    };
    writeJson(PANEL_SESSION_KEY, next);
    set(next);
  },
  clear: () => {
    writeJson(PANEL_SESSION_KEY, empty);
    set(empty);
  },
}));
