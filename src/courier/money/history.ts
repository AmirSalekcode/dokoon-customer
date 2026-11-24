import { create } from 'zustand';
import { courierApi, type CourierApi } from '../api/client';
import type { HistoryItem, HistoryPage, Settlement } from '../api/types';
import { showFullPageError } from '../errors/fullPage';

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface MoneyListsState {
  items: HistoryItem[];
  nextCursor: string | null;
  status: Status;
  more: 'idle' | 'loading' | 'error';
  settlements: Settlement[] | null;
  settleStatus: Status;
  loadHistory: (api?: CourierApi) => Promise<void>;
  loadMore: (api?: CourierApi) => Promise<void>;
  loadSettlements: (api?: CourierApi) => Promise<void>;
  reset: () => void;
}

/** Bumps on every first-page load so a slow older page never lands on a newer list. */
let gen = 0;

const initial = {
  items: [] as HistoryItem[],
  nextCursor: null,
  status: 'idle' as Status,
  more: 'idle' as const,
  settlements: null,
  settleStatus: 'idle' as Status,
};

/**
 * Trip history (`GET /c/orders/history`, cursor pages) and weekly payouts (`GET /c/settlements`).
 * Amounts are shown as sent. A reload of a list already on screen is silent: the rows stay while it runs,
 * and a failed reload keeps them (no error page over data the courier can still read).
 */
export const useMoneyLists = create<MoneyListsState>((set, get) => ({
  ...initial,

  loadHistory: async (api = courierApi()) => {
    const mine = ++gen;
    const had = get().status === 'ready';
    set({ more: 'idle', ...(had ? {} : { status: 'loading' }) });
    try {
      const { data, error } = await api.GET('/c/orders/history', { params: { query: {} } });
      if (mine !== gen) return;
      if (error !== undefined || !data) throw error ?? new Error('empty history');
      const page = data as HistoryPage;
      set({ items: page.items ?? [], nextCursor: page.nextCursor ?? null, status: 'ready' });
    } catch (e) {
      if (mine !== gen) return;
      if (had) return;
      set({ status: 'error' });
      showFullPageError(e, () => void get().loadHistory(api));
    }
  },

  loadMore: async (api = courierApi()) => {
    const { nextCursor, more, status } = get();
    if (!nextCursor || more === 'loading' || status !== 'ready') return;
    const mine = gen;
    set({ more: 'loading' });
    try {
      const { data, error } = await api.GET('/c/orders/history', { params: { query: { cursor: nextCursor } } });
      if (mine !== gen) return;
      if (error !== undefined || !data) throw error ?? new Error('empty history page');
      const page = data as HistoryPage;
      const seen = new Set(get().items.map((o) => o.id));
      set({
        items: [...get().items, ...(page.items ?? []).filter((o) => !seen.has(o.id))],
        nextCursor: page.nextCursor ?? null,
        more: 'idle',
      });
    } catch {
      // The rows already loaded stay; the end of the list offers a retry.
      if (mine === gen) set({ more: 'error' });
    }
  },

  loadSettlements: async (api = courierApi()) => {
    const had = get().settleStatus === 'ready';
    if (!had) set({ settleStatus: 'loading' });
    try {
      const { data, error } = await api.GET('/c/settlements');
      if (error !== undefined || !data) throw error ?? new Error('empty settlements');
      set({ settlements: data as Settlement[], settleStatus: 'ready' });
    } catch (e) {
      if (had) return;
      set({ settleStatus: 'error' });
      showFullPageError(e, () => void get().loadSettlements(api));
    }
  },

  reset: () => {
    gen++;
    set(initial);
  },
}));
