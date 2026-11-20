import { create } from 'zustand';
import { panelApi, type PanelApi } from '../api/client';
import type { Order, OrderStatus } from '../api/types';
import { showFullPageError } from '../errors/fullPage';
import type { RealtimeMessage } from '../realtime/events';

/** Live (non-history) tabs of the orders list. */
export const LIVE_TABS = ['new', 'prep', 'ready_or_way'] as const;
export type LiveTab = (typeof LIVE_TABS)[number];
export const TAB_OF: Partial<Record<OrderStatus, LiveTab>> = {
  new: 'new',
  prep: 'prep',
  ready: 'ready_or_way',
  way: 'ready_or_way',
};

interface OrdersState {
  /** Active orders by id (new / prep / ready / way); finished ones drop out. */
  byId: Record<string, Order>;
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** ms epoch of the last successful sync. */
  syncedAt: number | null;
  /**
   * Re-read the live tabs from the server (after login, after a reconnect, every 15 s while the live
   * connection is down). `silent`: background refresh, failures do not open an error page.
   */
  sync: (opts?: { silent?: boolean; api?: PanelApi }) => Promise<boolean>;
  /** Apply one realtime event (order.created/updated/cancelled/expired). */
  apply: (msg: RealtimeMessage) => void;
  /** The server's answer to an action of this device (same rule as order.updated). */
  upsert: (o: Order) => void;
  /** Orders with an action in flight (buttons show a spinner, no double tap). */
  busy: Record<string, true>;
  setBusy: (id: string, on: boolean) => void;
  reset: () => void;
}

export const isActive = (o: Order) => !!o.status && o.status in TAB_OF;

export const useOrders = create<OrdersState>((set, get) => ({
  byId: {},
  status: 'idle',
  syncedAt: null,

  sync: async ({ silent = false, api = panelApi() } = {}) => {
    if (!silent || get().status === 'idle') set({ status: 'loading' });
    try {
      const pages = await Promise.all(
        LIVE_TABS.map((tab) => api.GET('/r/orders', { params: { query: { tab } } })),
      );
      const byId: Record<string, Order> = {};
      for (const { data, error } of pages) {
        if (error !== undefined || !data) throw error ?? new Error('empty orders page');
        for (const o of data.items ?? []) if (o.id && isActive(o)) byId[o.id] = o;
      }
      set({ byId, status: 'ready', syncedAt: Date.now() });
      return true;
    } catch (e) {
      set({ status: get().syncedAt ? 'ready' : 'error' });
      if (!silent) showFullPageError(e, () => void get().sync());
      return false;
    }
  },

  apply: (msg) => {
    const byId = { ...get().byId };
    switch (msg.event) {
      case 'order.created':
      case 'order.updated': {
        const o = msg.data;
        if (!o.id) return;
        if (isActive(o)) byId[o.id] = o;
        else delete byId[o.id];
        break;
      }
      case 'order.cancelled':
        delete byId[msg.data.orderId];
        break;
      case 'order.expired':
        delete byId[msg.data.orderId];
        break;
      default:
        return;
    }
    set({ byId });
  },

  upsert: (o) => {
    if (!o.id) return;
    const byId = { ...get().byId };
    if (isActive(o)) byId[o.id] = o;
    else delete byId[o.id];
    set({ byId });
  },

  busy: {},
  setBusy: (id, on) => {
    const busy = { ...get().busy };
    if (on) busy[id] = true;
    else delete busy[id];
    set({ busy });
  },

  reset: () => set({ byId: {}, status: 'idle', syncedAt: null, busy: {} }),
}));

/** Count of active orders per live tab. */
export function countByTab(byId: Record<string, Order>): Record<LiveTab, number> {
  const c: Record<LiveTab, number> = { new: 0, prep: 0, ready_or_way: 0 };
  for (const o of Object.values(byId)) {
    const t = o.status && TAB_OF[o.status];
    if (t) c[t] += 1;
  }
  return c;
}
