import { create } from 'zustand';
import { hydrateSecure, readSecureJsonSync, secureBackend, writeSecureJson } from '@/lib/secureStore';
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
 * Restaurant session tokens: localStorage in the PWA, the Android Keystore in the app (D-38, KAN-72;
 * `hydratePanelSession()` runs before the first render there). Several devices may be signed in at once (D-96).
 */
export const usePanelSession = create<PanelSessionState>((set, get) => ({
  ...readSecureJsonSync<Persisted>(PANEL_SESSION_KEY, empty),
  setSession: ({ accessToken, refreshToken, status }) => {
    const next: Persisted = {
      accessToken,
      refreshToken,
      status: status === undefined ? get().status : status,
    };
    writeSecureJson(PANEL_SESSION_KEY, next);
    set(next);
  },
  clear: () => {
    writeSecureJson(PANEL_SESSION_KEY, empty);
    set(empty);
  },
}));

/** Android app: load the Keystore session before the first render (no-op on the web). */
export async function hydratePanelSession(): Promise<void> {
  if (!secureBackend().native) return;
  usePanelSession.setState(await hydrateSecure<Persisted>(PANEL_SESSION_KEY, empty));
}
