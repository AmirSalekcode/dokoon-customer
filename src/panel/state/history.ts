import { create } from 'zustand';
import { panelApi, type PanelApi } from '../api/client';
import type { Order } from '../api/types';
import { showFullPageError } from '../errors/fullPage';

/** History date chips (D-102): today / 7 days / 30 days / all, default 7 days. */
export const RANGES = ['today', '7d', '30d', 'all'] as const;
export type HistoryRange = (typeof RANGES)[number];
export const RANGE_LABEL: Record<HistoryRange, string> = {
  today: 'امروز',
  '7d': '۷ روز',
  '30d': '۳۰ روز',
  all: 'همه',
};
const DAYS: Record<HistoryRange, number | null> = { today: 1, '7d': 7, '30d': 30, all: null };

/** Restaurant-local calendar date `YYYY-MM-DD` (the contract's `from`/`to` are dates). */
export const localDate = (t: number) => new Date(t).toLocaleDateString('en-CA');

/** `from`/`to` for a chip; both inclusive, `all` sends none. */
export function rangeDates(range: HistoryRange, now = Date.now()): { from?: string; to?: string } {
  const days = DAYS[range];
  if (days === null) return {};
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  return { from: localDate(start.getTime()), to: localDate(now) };
}

interface HistoryState {
  range: HistoryRange;
  items: Order[];
  nextCursor: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** A further page is loading / failed (the list above stays). */
  more: 'idle' | 'loading' | 'error';
  /** An order finished since the last load: reload when the tab is shown. */
  stale: boolean;
  setRange: (r: HistoryRange) => void;
  /** First page of the current range (`silent`: keep the list while reloading). */
  load: (opts?: { silent?: boolean; api?: PanelApi }) => Promise<void>;
  loadMore: (api?: PanelApi) => Promise<void>;
  invalidate: () => void;
  reset: () => void;
}

/** Bumps on every first-page load so a slow older response never overwrites a newer range. */
let gen = 0;

export const useHistory = create<HistoryState>((set, get) => ({
  range: '7d',
  items: [],
  nextCursor: null,
  status: 'idle',
  more: 'idle',
  stale: false,

  setRange: (range) => {
    if (range === get().range && get().status !== 'error') return;
    set({ range, items: [], nextCursor: null });
    void get().load();
  },

  load: async ({ silent = false, api = panelApi() } = {}) => {
    const mine = ++gen;
    set({ stale: false, more: 'idle', ...(silent && get().status === 'ready' ? {} : { status: 'loading' }) });
    try {
      const { data, error } = await api.GET('/r/orders', {
        params: { query: { tab: 'history', ...rangeDates(get().range) } },
      });
      if (mine !== gen) return;
      if (error !== undefined || !data) throw error ?? new Error('empty history page');
      set({ items: data.items ?? [], nextCursor: data.nextCursor ?? null, status: 'ready' });
    } catch (e) {
      if (mine !== gen) return;
      set({ status: 'error' });
      showFullPageError(e, () => void get().load());
    }
  },

  loadMore: async (api = panelApi()) => {
    const { nextCursor, more, status } = get();
    if (!nextCursor || more === 'loading' || status !== 'ready') return;
    const mine = gen;
    set({ more: 'loading' });
    try {
      const { data, error } = await api.GET('/r/orders', {
        params: { query: { tab: 'history', cursor: nextCursor, ...rangeDates(get().range) } },
      });
      if (mine !== gen) return;
      if (error !== undefined || !data) throw error ?? new Error('empty history page');
      const seen = new Set(get().items.map((o) => o.id));
      set({
        items: [...get().items, ...(data.items ?? []).filter((o) => !seen.has(o.id))],
        nextCursor: data.nextCursor ?? null,
        more: 'idle',
      });
    } catch {
      // Inline «تلاش دوباره» under the list; the loaded pages stay.
      if (mine === gen) set({ more: 'error' });
    }
  },

  invalidate: () => set({ stale: true }),

  reset: () => {
    gen += 1;
    set({ range: '7d', items: [], nextCursor: null, status: 'idle', more: 'idle', stale: false });
  },
}));
