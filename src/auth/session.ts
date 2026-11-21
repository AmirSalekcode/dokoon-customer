import { create } from 'zustand';
import type { User } from '@/api/types';
import { hydrateSecure, readSecureJsonSync, secureBackend, writeSecureJson } from '@/lib/secureStore';

const KEY = 'dk-session';

export interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setSession: (s: { accessToken: string; refreshToken: string; user?: User | null }) => void;
  setUser: (u: User) => void;
  clear: () => void;
}

type Persisted = Pick<SessionState, 'accessToken' | 'refreshToken' | 'user'>;
const empty: Persisted = { accessToken: null, refreshToken: null, user: null };

/**
 * Session tokens: localStorage in the PWA, the Android Keystore in the app (D-38, KAN-72;
 * `hydrateSession()` runs before the first render there).
 */
export const useSession = create<SessionState>((set, get) => ({
  ...readSecureJsonSync<Persisted>(KEY, empty),
  setSession: ({ accessToken, refreshToken, user }) => {
    const next = { accessToken, refreshToken, user: user ?? get().user };
    writeSecureJson(KEY, next);
    set(next);
  },
  setUser: (user) => {
    const { accessToken, refreshToken } = get();
    writeSecureJson(KEY, { accessToken, refreshToken, user });
    set({ user });
  },
  clear: () => {
    writeSecureJson(KEY, empty);
    set(empty);
  },
}));

/** Android app: load the Keystore session before the first render (no-op on the web). */
export async function hydrateSession(): Promise<void> {
  if (!secureBackend().native) return;
  useSession.setState(await hydrateSecure<Persisted>(KEY, empty));
}
