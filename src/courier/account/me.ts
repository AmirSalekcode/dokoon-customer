import { create } from 'zustand';
import { courierApi, type CourierApi } from '../api/client';
import type { MeProfile } from '../api/types';
import { showFullPageError } from '../errors/fullPage';

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface MeState {
  me: MeProfile | null;
  status: Status;
  /** Keep a profile that boot / the waiting page already fetched. */
  set: (me: MeProfile) => void;
  load: (api?: CourierApi) => Promise<void>;
  /** After a Sheba change request: the review is pending until the next `GET /c/me` says otherwise. */
  markShebaPending: () => void;
  reset: () => void;
}

/**
 * The courier's own profile (`GET /c/me`) for the account tab and «اطلاعات من». Loaded again on each visit
 * to the account tab (document review results must show); a failed reload keeps what is on screen.
 */
export const useCourierMe = create<MeState>((set, get) => ({
  me: null,
  status: 'idle',

  set: (me) => set({ me, status: 'ready' }),

  load: async (api = courierApi()) => {
    const had = get().me !== null;
    if (!had) set({ status: 'loading' });
    try {
      const { data, error } = await api.GET('/c/me');
      if (error !== undefined || !data) throw error ?? new Error('empty profile');
      set({ me: data as MeProfile, status: 'ready' });
    } catch (e) {
      if (had) return;
      set({ status: 'error' });
      showFullPageError(e, () => void get().load(api));
    }
  },

  markShebaPending: () => {
    const me = get().me;
    if (me) set({ me: { ...me, shebaChangePending: true } });
  },

  reset: () => set({ me: null, status: 'idle' }),
}));
