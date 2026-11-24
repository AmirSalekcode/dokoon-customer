import { create } from 'zustand';
import { ApiError } from '@/api/errors';
import { toast } from '@/ui/toast';
import { courierApi } from '../api/client';
import type { ActiveOrder, OrderStage } from '../api/types';
import { showFullPageError } from '../errors/fullPage';
import type { CourierRealtimeMessage } from '../realtime/events';
import { COURIER_TOAST_MS, useOnline } from './online';

/**
 * The order in progress (KAN-94): `GET /c/orders/active` (`204` = none), kept fresh by `order.updated` /
 * `order.cancelled`. It drives the «سفارش در جریان» banner and keeps tracking on (courier rule 3) through
 * `useOnline.setActive`. The customer's address and phone live only here, only until delivery (KAN-97
 * clears them).
 */
export const STAGE_LABEL: Record<OrderStage, string> = {
  toRest: 'در راه رستوران',
  pickup: 'تحویل‌گیری از رستوران',
  toCust: 'در راه مشتری',
  handover: 'تحویل به مشتری',
  done: 'تحویل شد',
};

/**
 * Distances and time of the accepted offer (`Offer.kmToRest/km/minutes`), kept in memory for the map chip:
 * `ActiveOrder` carries none of them (contract-notes 41). Unknown after a restart.
 */
export interface TripInfo {
  kmToRest?: number;
  km?: number;
  minutes?: number;
}

interface ActiveState {
  order: ActiveOrder | null;
  trip: TripInfo | null;
  /** Dishes ticked at pickup (ids), kept while the courier moves between screens. */
  checked: string[];
  toggleItem: (id: string) => void;
  /** The first answer from the server arrived. */
  loaded: boolean;
  load: () => Promise<void>;
  /** `trip`: on accept only; a different order forgets the old trip and ticks. */
  set: (order: ActiveOrder | null, trip?: TripInfo) => void;
  apply: (msg: CourierRealtimeMessage) => void;
  clear: () => void;
}

const isOpen = (o: ActiveOrder | null | undefined): o is ActiveOrder => !!o?.id && o.stage !== 'done';

export const useActiveOrder = create<ActiveState>((set, get) => ({
  order: null,
  trip: null,
  checked: [],
  loaded: false,

  async load() {
    try {
      const { data, error, response } = await courierApi().GET('/c/orders/active');
      if (error !== undefined) return;
      get().set(response.status === 204 ? null : (data as ActiveOrder));
    } catch (e) {
      // An ended session gets its page; offline / server trouble keeps what we had (the next reconnect asks again).
      if (e instanceof ApiError && e.kind === 'e401') showFullPageError(e, () => void get().load());
    } finally {
      set({ loaded: true });
    }
  },

  toggleItem(id) {
    const c = get().checked;
    set({ checked: c.includes(id) ? c.filter((x) => x !== id) : [...c, id] });
  },

  set(order, trip) {
    const next = isOpen(order) ? order : null;
    const same = !!next && next.id === get().order?.id;
    set({
      order: next,
      trip: trip ?? (same ? get().trip : null),
      checked: same ? get().checked : [],
    });
    useOnline.getState().setActive(next !== null);
  },

  apply(msg) {
    const cur = get().order;
    if (msg.event === 'order.updated') {
      if (!cur || cur.id === msg.data.id) get().set(msg.data);
    } else if (msg.event === 'order.cancelled' && cur?.id === msg.data.orderId) {
      get().set(null);
      toast('سفارش در جریان لغو شد', 'warn', COURIER_TOAST_MS);
    }
  },

  clear() {
    set({ order: null, trip: null, checked: [], loaded: false });
  },
}));
