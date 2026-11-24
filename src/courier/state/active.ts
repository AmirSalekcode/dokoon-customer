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

interface ActiveState {
  order: ActiveOrder | null;
  /** The first answer from the server arrived. */
  loaded: boolean;
  load: () => Promise<void>;
  set: (order: ActiveOrder | null) => void;
  apply: (msg: CourierRealtimeMessage) => void;
  clear: () => void;
}

const isOpen = (o: ActiveOrder | null | undefined): o is ActiveOrder => !!o?.id && o.stage !== 'done';

export const useActiveOrder = create<ActiveState>((set, get) => ({
  order: null,
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

  set(order) {
    const next = isOpen(order) ? order : null;
    set({ order: next });
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
    set({ order: null, loaded: false });
  },
}));
