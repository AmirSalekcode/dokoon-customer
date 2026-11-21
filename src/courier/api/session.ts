import { create } from 'zustand';
import { hydrateSecure, secureBackend, writeSecureJson } from '@/lib/secureStore';
import type { CourierStatus } from './types';

/** Keystore key of the Android app's token. The web never stores a token (HttpOnly cookie). */
export const COURIER_SESSION_KEY = 'dkc-session';

interface Persisted {
  accessToken: string | null;
}

export interface CourierSessionState extends Persisted {
  /** Approval status from the last verify / `GET /c/me` (memory only; routes login → wait, reg or orders). */
  status: CourierStatus | null;
  setSession: (s: { accessToken?: string | null; status?: CourierStatus | null }) => void;
  setStatus: (status: CourierStatus | null) => void;
  clear: () => void;
}

const native = () => secureBackend().native;

/**
 * Courier session (security checklist: «HttpOnly cookie on the web, Keystore on Android, never localStorage»).
 * - Web/PWA: the server keeps the session in an HttpOnly cookie, so JavaScript holds no token at all and the
 *   client sends `credentials: 'include'`. Nothing here is persisted.
 * - Android app: the bearer token lives in the Keystore (`hydrateCourierSession()` before the first render)
 *   and in memory.
 */
export const useCourierSession = create<CourierSessionState>((set, get) => ({
  accessToken: null,
  status: null,
  setSession: ({ accessToken, status }) => {
    // A token is only ever kept by the app; on the web a stray one is dropped.
    const token = native() ? (accessToken === undefined ? get().accessToken : accessToken) : null;
    if (native() && token !== get().accessToken) writeSecureJson(COURIER_SESSION_KEY, { accessToken: token });
    set({ accessToken: token, status: status === undefined ? get().status : status });
  },
  setStatus: (status) => set({ status }),
  clear: () => {
    if (native()) writeSecureJson(COURIER_SESSION_KEY, { accessToken: null });
    set({ accessToken: null, status: null });
  },
}));

/** Android app: load the Keystore token before the first render (no-op on the web). */
export async function hydrateCourierSession(): Promise<void> {
  if (!native()) return;
  const { accessToken } = await hydrateSecure<Persisted>(COURIER_SESSION_KEY, { accessToken: null });
  useCourierSession.setState({ accessToken });
}
