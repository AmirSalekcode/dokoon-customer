import type {
  DayHours,
  Food,
  MenuCategory,
  Notification,
  Order,
  RestaurantProfile,
  RestaurantSettings,
  Settlement,
} from '../api/types';
import * as D from './data';

/**
 * In-memory "server" for the restaurant mock (fresh on every page load, so demo times stay current).
 * Owns the order state machine so handlers and the mock WebSocket share one truth.
 */
export interface PanelMockDb {
  profile: RestaurantProfile;
  orders: Order[];
  categories: MenuCategory[];
  foods: Food[];
  hours: DayHours[];
  settings: RestaurantSettings;
  settlements: Settlement[];
  notifications: Notification[];
  docsUploaded: string[];
  /** phone → ms epoch of the last OTP request (429 inside the resend window). */
  otpSentAt: Record<string, number>;
  /** phone → status after a registration submitted in this page session (demo). */
  registrations: Record<string, 'pending'>;
  seq: number;
}

const clone = <T>(v: T): T => structuredClone(v);

function fresh(now = Date.now()): PanelMockDb {
  return {
    profile: clone(D.profile),
    orders: D.seedOrders(now),
    categories: clone(D.categories),
    foods: clone(D.foods),
    hours: clone(D.hours),
    settings: clone(D.settings),
    settlements: D.seedSettlements(now),
    notifications: D.seedNotifications(now),
    docsUploaded: [],
    otpSentAt: {},
    registrations: {},
    seq: 0,
  };
}

export let db = fresh();

/** Tests: start every case from the seed data. */
export function resetPanelMockDb() {
  db = fresh();
}

export type Transition = 'accept' | 'reject' | 'ready' | 'handover' | 'extend';

/** Server-side order state machine (contract: invalid transition → 409). */
export function transition(
  order: Order,
  action: Transition,
  arg: { prepMinutes?: number; addMinutes?: number; reason?: string } = {},
): { ok: true } | { ok: false; code: 'ALREADY_ANSWERED' | 'INVALID_TRANSITION' } {
  const s = order.status;
  const answered = s !== 'new';
  switch (action) {
    case 'accept':
      if (answered) return { ok: false, code: 'ALREADY_ANSWERED' };
      order.status = 'prep';
      order.prepMinutes = arg.prepMinutes;
      delete order.acceptDeadline;
      return { ok: true };
    case 'reject':
      if (s === 'new') order.status = 'rejected';
      else if (s === 'prep') order.status = 'cancelled';
      else
        return {
          ok: false,
          code: s === 'rejected' || s === 'expired' ? 'ALREADY_ANSWERED' : 'INVALID_TRANSITION',
        };
      order.rejectReason = arg.reason;
      delete order.acceptDeadline;
      return { ok: true };
    case 'extend':
      if (s !== 'prep') return { ok: false, code: 'INVALID_TRANSITION' };
      order.prepMinutes = (order.prepMinutes ?? 0) + (arg.addMinutes ?? 0);
      return { ok: true };
    case 'ready':
      if (s !== 'prep') return { ok: false, code: 'INVALID_TRANSITION' };
      order.status = 'ready';
      order.courier = { name: 'حسین جعفری', statusText: 'در راه رستوران', canCall: false };
      return { ok: true };
    case 'handover':
      if (s !== 'ready') return { ok: false, code: 'INVALID_TRANSITION' };
      order.status = 'way';
      order.courier = {
        name: order.courier?.name ?? 'حسین جعفری',
        statusText: 'در مسیر مشتری',
        canCall: false,
      };
      return { ok: true };
  }
}

/** New orders nobody answered before `acceptDeadline` expire (server rule); returns the expired ones. */
export function expireDue(now = Date.now()): Order[] {
  const due = db.orders.filter(
    (o) => o.status === 'new' && o.acceptDeadline && Date.parse(o.acceptDeadline) <= now,
  );
  for (const o of due) {
    o.status = 'expired';
    delete o.acceptDeadline;
  }
  return due;
}

/** Adds a new incoming order (live demo / tests). */
export function addIncomingOrder(now = Date.now()): Order {
  db.seq += 1;
  const order = D.demoOrder(now, db.seq);
  db.orders.unshift(order);
  return order;
}

const TAB_STATUSES: Record<string, NonNullable<Order['status']>[]> = {
  new: ['new'],
  prep: ['prep'],
  ready_or_way: ['ready', 'way'],
  history: ['done', 'rejected', 'expired', 'cancelled'],
};
export const HISTORY_PAGE = 10;
/** Local calendar date (the panel's date chips send the restaurant's local dates). */
const localDate = (isoTime: string) => new Date(isoTime).toLocaleDateString('en-CA');

export function listOrders(q: {
  tab: string;
  cursor?: string | null;
  from?: string | null;
  to?: string | null;
}) {
  const statuses = TAB_STATUSES[q.tab];
  if (!statuses) return null;
  let items = db.orders.filter((o) => statuses.includes(o.status!));
  if (q.tab !== 'history') return { items };
  items = items
    .filter((o) => (!q.from || localDate(o.placedAt!) >= q.from) && (!q.to || localDate(o.placedAt!) <= q.to))
    .sort((a, b) => Date.parse(b.placedAt!) - Date.parse(a.placedAt!));
  const start = q.cursor ? Number(q.cursor.replace(/^c/, '')) || 0 : 0;
  const page = items.slice(start, start + HISTORY_PAGE);
  const next = start + HISTORY_PAGE < items.length ? `c${start + HISTORY_PAGE}` : undefined;
  return { items: page, ...(next ? { nextCursor: next } : {}) };
}
