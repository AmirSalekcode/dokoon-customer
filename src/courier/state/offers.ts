import { create } from 'zustand';
import { courierApi } from '../api/client';
import type { Offer } from '../api/types';
import { showFullPageError } from '../errors/fullPage';
import type { CourierRealtimeMessage } from '../realtime/events';

/**
 * Nearby offers (KAN-94, courier screen specs «سفارش‌ها»): `GET /c/offers` plus the live `offer.created` /
 * `offer.gone` events. The server owns each offer's 30 s window (`expiresAt`); the list only hides an offer
 * once that time has passed, it never decides anything itself.
 */
export type OffersStatus = 'idle' | 'loading' | 'ready' | 'error';

interface OffersState {
  list: Offer[];
  status: OffersStatus;
  /** `silent`: background refresh (reconnect, polling) — no spinner, no error page. */
  load: (opts?: { silent?: boolean }) => Promise<void>;
  apply: (msg: CourierRealtimeMessage) => void;
  /** Drop offers whose server deadline has passed. */
  prune: (now?: number) => void;
  clear: () => void;
}

const open = (o: Offer, now: number) => !o.expiresAt || Date.parse(o.expiresAt) > now;
/** Soonest deadline first: the offer about to close is on top. */
const order = (list: Offer[]) =>
  [...list].sort((a, b) => Date.parse(a.expiresAt ?? '') - Date.parse(b.expiresAt ?? '') || 0);

let seq = 0;

export const useOffers = create<OffersState>((set, get) => ({
  list: [],
  status: 'idle',

  async load({ silent = false } = {}) {
    const run = ++seq;
    if (!silent) set({ status: get().list.length ? 'ready' : 'loading' });
    try {
      const { data, error } = await courierApi().GET('/c/offers');
      if (run !== seq) return;
      if (error !== undefined || !Array.isArray(data)) {
        // A background refresh never turns a shown list into an error, but it ends a spinner.
        if (!silent || get().status === 'loading') set({ status: 'error' });
        return;
      }
      set({ list: order(data.filter((o) => open(o, Date.now()))), status: 'ready' });
    } catch (e) {
      if (run !== seq) return;
      if (silent) {
        if (get().status === 'loading') set({ status: 'error' });
        return;
      }
      set({ status: 'error' });
      showFullPageError(e, () => void get().load());
    }
  },

  apply(msg) {
    if (msg.event === 'offer.created') {
      const o = msg.data;
      if (!o.id || !open(o, Date.now())) return;
      set({ list: order([...get().list.filter((x) => x.id !== o.id), o]), status: 'ready' });
    } else if (msg.event === 'offer.gone') {
      set({ list: get().list.filter((x) => x.id !== msg.data.offerId) });
    }
  },

  prune(now = Date.now()) {
    const list = get().list;
    const kept = list.filter((o) => open(o, now));
    if (kept.length !== list.length) set({ list: kept });
  },

  clear() {
    seq += 1;
    set({ list: [], status: 'idle' });
  },
}));
