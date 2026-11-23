import { create } from 'zustand';
import { courierApi, type CourierApi } from '../api/client';
import type { Earnings, EarningsPeriod } from '../api/types';
import { showFullPageError } from '../errors/fullPage';

type Load<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null };
const idle = <T>(): Load<T> => ({ status: 'idle', data: null });
const fresh = (): Record<EarningsPeriod, Load<Earnings>> => ({ today: idle(), week: idle(), month: idle() });

interface EarningsState {
  period: EarningsPeriod;
  byPeriod: Record<EarningsPeriod, Load<Earnings>>;
  setPeriod: (p: EarningsPeriod) => void;
  load: (p: EarningsPeriod, api?: CourierApi) => Promise<void>;
  reset: () => void;
}

/**
 * `GET /c/earnings?period=`. Every number is the server's (cash rule undecided): this store never adds,
 * subtracts or derives an amount. A period already on screen is refreshed in place on each visit (a trip
 * just delivered must show up); if that refresh fails the old numbers stay and no error page covers them.
 */
export const useEarnings = create<EarningsState>((set, get) => ({
  period: 'today',
  byPeriod: fresh(),

  setPeriod: (period) => set({ period }),

  load: async (p, api = courierApi()) => {
    const had = get().byPeriod[p].data;
    set({ byPeriod: { ...get().byPeriod, [p]: { data: had, status: 'loading' } } });
    try {
      const { data, error } = await api.GET('/c/earnings', { params: { query: { period: p } } });
      if (error !== undefined || !data) throw error ?? new Error('empty earnings');
      set({ byPeriod: { ...get().byPeriod, [p]: { status: 'ready', data: data as Earnings } } });
    } catch (e) {
      const cur = get().byPeriod[p];
      set({ byPeriod: { ...get().byPeriod, [p]: { ...cur, status: cur.data ? 'ready' : 'error' } } });
      if (!cur.data) showFullPageError(e, () => void get().load(p, api));
    }
  },

  reset: () => set({ period: 'today', byPeriod: fresh() }),
}));
