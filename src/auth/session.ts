import { create } from 'zustand';
import type { User } from '@/api/types';
import { readJson, writeJson } from '@/lib/storage';

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
 * Session tokens. NOTE: persisted in localStorage for now (PWA). For the Android shell this should
 * move to secure native storage before release — tracked as an open item in the phase-1 report.
 */
export const useSession = create<SessionState>((set, get) => ({
  ...readJson<Persisted>(KEY, empty),
  setSession: ({ accessToken, refreshToken, user }) => {
    const next = { accessToken, refreshToken, user: user ?? get().user };
    writeJson(KEY, next);
    set(next);
  },
  setUser: (user) => {
    const { accessToken, refreshToken } = get();
    writeJson(KEY, { accessToken, refreshToken, user });
    set({ user });
  },
  clear: () => {
    writeJson(KEY, empty);
    set(empty);
  },
}));
