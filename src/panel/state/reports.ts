import { create } from 'zustand';
import { panelApi, type PanelApi } from '../api/client';
import type { Report, Settlement } from '../api/types';
import { showFullPageError } from '../errors/fullPage';

export type Period = 'today' | 'week' | 'month';
export const PERIODS: readonly Period[] = ['today', 'week', 'month'];
export const PERIOD_LABEL: Record<Period, string> = { today: 'امروز', week: 'این هفته', month: 'این ماه' };

type Load<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null };
const idle = <T>(): Load<T> => ({ status: 'idle', data: null });

interface ReportsState {
  period: Period;
  reports: Record<Period, Load<Report>>;
  settlements: Load<Settlement[]>;
  setPeriod: (p: Period) => void;
  loadReport: (p: Period, api?: PanelApi) => Promise<void>;
  loadSettlements: (api?: PanelApi) => Promise<void>;
  reset: () => void;
}

/**
 * Sales reports (`GET /r/reports?period=`) and settlements (`GET /r/settlements`). Every number is the
 * server's (D-94, D-95): this store never adds, subtracts or derives an amount.
 */
export const useReports = create<ReportsState>((set, get) => ({
  period: 'today',
  reports: { today: idle(), week: idle(), month: idle() },
  settlements: idle(),

  setPeriod: (period) => set({ period }),

  loadReport: async (p, api = panelApi()) => {
    const prev = get().reports[p];
    set({ reports: { ...get().reports, [p]: { ...prev, status: 'loading' } } });
    try {
      const { data, error } = await api.GET('/r/reports', { params: { query: { period: p } } });
      if (error !== undefined || !data) throw error ?? new Error('empty report');
      set({ reports: { ...get().reports, [p]: { status: 'ready', data } } });
    } catch (e) {
      set({ reports: { ...get().reports, [p]: { ...get().reports[p], status: 'error' } } });
      showFullPageError(e, () => void get().loadReport(p, api));
    }
  },

  loadSettlements: async (api = panelApi()) => {
    set({ settlements: { ...get().settlements, status: 'loading' } });
    try {
      const { data, error } = await api.GET('/r/settlements');
      if (error !== undefined || !data) throw error ?? new Error('empty settlements');
      set({ settlements: { status: 'ready', data } });
    } catch (e) {
      set({ settlements: { ...get().settlements, status: 'error' } });
      showFullPageError(e, () => void get().loadSettlements(api));
    }
  },

  reset: () =>
    set({ period: 'today', reports: { today: idle(), week: idle(), month: idle() }, settlements: idle() }),
}));
