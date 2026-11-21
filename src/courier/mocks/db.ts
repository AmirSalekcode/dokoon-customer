import type {
  ActiveOrder,
  CourierDoc,
  HistoryItem,
  Offer,
  OrderStage,
  Settlement,
} from '../api/types';
import * as D from './data';

/**
 * In-memory "server" of the courier mock (fresh on every page load, so demo times stay current). Owns the
 * offer and order state machine so the REST handlers and the mock WebSocket share one truth.
 */
export interface CourierMockDb {
  online: boolean;
  offers: Offer[];
  /** offer id → the order behind it (revealed only on accept). */
  orderOf: Record<string, D.OfferSeed['order']>;
  /** Offers another courier won (accept → 409 OFFER_TAKEN instead of OFFER_EXPIRED). */
  taken: string[];
  active: ActiveOrder | null;
  history: HistoryItem[];
  settlements: Settlement[];
  docs: CourierDoc[];
  /** Last reported position (only accepted while online or with an active order). */
  location: { lat: number; lng: number; at: string } | null;
  consent: { performance: boolean; analytics: boolean } | null;
  /** phone → ms epoch of the last OTP request (429 inside the resend window). */
  otpSentAt: Record<string, number>;
  /** phone → status after a registration submitted in this page session (demo). */
  registrations: Record<string, 'pending'>;
  shebaChangeRequested: boolean;
  seq: number;
}

function fresh(now = Date.now()): CourierMockDb {
  return {
    online: false,
    offers: [],
    orderOf: {},
    taken: [],
    active: null,
    history: D.seedHistory(now),
    settlements: D.seedSettlements(now),
    docs: D.seedDocs(),
    location: null,
    consent: null,
    otpSentAt: {},
    registrations: {},
    shebaChangeRequested: false,
    seq: 0,
  };
}

export let db = fresh();

/** Tests: start every case from the seed data. */
export function resetCourierMockDb() {
  db = fresh();
}

const iso = (t: number) => new Date(t).toISOString();

function open(seed: D.OfferSeed, id: string, expiresAt: number): Offer {
  db.orderOf[id] = structuredClone(seed.order);
  const offer: Offer = { ...structuredClone(seed.offer), id, expiresAt: iso(expiresAt) };
  db.offers.push(offer);
  return offer;
}

/** Going online: the three seed offers arrive with staggered 30 s windows. */
export function seedOffers(now = Date.now()): Offer[] {
  return D.offerSeeds.map((s, i) => open(s, s.offer.id!, now + D.OFFER_TTL_MS + i * 15_000));
}

/** A new nearby offer (demo stream while online). */
export function addOffer(now = Date.now()): Offer {
  db.seq += 1;
  const seed = D.extraSeeds[(db.seq - 1) % D.extraSeeds.length];
  const id = `of-n${db.seq}`;
  const offer = open(seed, id, now + D.OFFER_TTL_MS);
  db.orderOf[id].no = 4830 + db.seq;
  return offer;
}

const drop = (id: string) => {
  db.offers = db.offers.filter((o) => o.id !== id);
};

/** Server rule: unanswered offers close at expiresAt. Returns the ids that just expired. */
export function expireDue(now = Date.now()): string[] {
  const due = db.offers.filter((o) => Date.parse(o.expiresAt!) <= now).map((o) => o.id!);
  due.forEach(drop);
  return due;
}

/** Demo / E2E: another courier wins this offer (first courier wins, atomically). */
export function takeByOther(id: string): boolean {
  if (!db.offers.some((o) => o.id === id)) return false;
  drop(id);
  db.taken.push(id);
  return true;
}

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; status: number; code: string };
const fail = (status: number, code: string): { ok: false; status: number; code: string } => ({
  ok: false,
  status,
  code,
});

export function setOnline(online: boolean, now = Date.now()): Result<{ online: boolean }> {
  if (!online && db.active) return fail(409, 'ACTIVE_ORDER');
  if (online && !db.online) seedOffers(now);
  if (!online) db.offers = [];
  db.online = online;
  return { ok: true, value: { online } };
}

/** Atomic accept: first courier wins; one order at a time. */
export function acceptOffer(id: string, now = Date.now()): Result<ActiveOrder> {
  expireDue(now);
  if (db.active) return fail(409, 'ACTIVE_ORDER');
  if (!db.offers.some((o) => o.id === id)) {
    if (db.taken.includes(id)) return fail(409, 'OFFER_TAKEN');
    return db.orderOf[id] ? fail(409, 'OFFER_EXPIRED') : fail(404, 'NOT_FOUND');
  }
  drop(id);
  db.active = { ...structuredClone(db.orderOf[id]), id: `ord-${id}`, stage: 'toRest' };
  return { ok: true, value: db.active };
}

export function rejectOffer(id: string): void {
  drop(id);
}

const NEXT: Partial<Record<OrderStage, OrderStage>> = {
  toRest: 'pickup',
  pickup: 'toCust',
  toCust: 'handover',
};

function activeById(id: string): Result<ActiveOrder> {
  return db.active && db.active.id === id ? { ok: true, value: db.active } : fail(404, 'NOT_FOUND');
}

/** One step forward. Leaving pickup needs every item ticked (screen-specs: «تیک غذاها»). */
export function advanceStage(id: string, stage: string, checkedItems: string[] = []): Result<ActiveOrder> {
  const found = activeById(id);
  if (!found.ok) return found;
  const order = found.value;
  if (NEXT[order.stage!] !== stage) return fail(409, 'INVALID_STAGE');
  if (stage === 'toCust') {
    const missing = (order.items ?? []).filter((i) => !checkedItems.includes(i.id!));
    if (missing.length) return fail(400, 'ITEMS_UNCHECKED');
  }
  order.stage = stage as OrderStage;
  return { ok: true, value: order };
}

/** Withdraw only before the food was picked up; the offer then goes to other couriers. */
export function withdraw(id: string): Result {
  const found = activeById(id);
  if (!found.ok) return found;
  if (found.value.stage !== 'toRest' && found.value.stage !== 'pickup') return fail(409, 'WITHDRAW_CLOSED');
  db.active = null;
  return { ok: true, value: undefined };
}

export function reportIssue(id: string): Result {
  const found = activeById(id);
  return found.ok ? { ok: true, value: undefined } : found;
}

/** «مشتری در دسترس نیست»: reported to the city manager; the order stays open (screen-specs). */
export function reportUnreachable(id: string): Result {
  const found = activeById(id);
  if (!found.ok) return found;
  if (found.value.stage !== 'toCust' && found.value.stage !== 'handover') return fail(409, 'INVALID_STAGE');
  return { ok: true, value: undefined };
}

/** Delivered. Cash orders need the collected amount; a mismatch is allowed but reported (courier rule 5). */
export function deliver(
  id: string,
  cashCollected: unknown,
  now = Date.now(),
): Result<{ earn: number; cashMismatch: boolean }> {
  const found = activeById(id);
  if (!found.ok) return found;
  const order = found.value;
  if (order.stage !== 'handover') return fail(409, 'INVALID_STAGE');
  let cashMismatch = false;
  let collected: number | undefined;
  if (order.cash) {
    if (typeof cashCollected !== 'number' || !Number.isInteger(cashCollected) || cashCollected < 0)
      return fail(400, 'CASH_REQUIRED');
    collected = cashCollected;
    cashMismatch = cashCollected !== order.due;
  }
  order.stage = 'done';
  db.history.unshift({
    id: `h-${order.id}`,
    no: order.no!,
    rest: order.rest!,
    toArea: order.custAddress!,
    deliveredAt: iso(now),
    km: 2,
    earn: order.earn!,
    cash: !!order.cash,
    ...(collected !== undefined ? { cashCollected: collected } : {}),
  });
  db.active = null;
  return { ok: true, value: { earn: order.earn!, cashMismatch } };
}

/** Location is only taken while online or with an active order (courier rule 3). */
export function recordLocation(lat: number, lng: number, at: string): Result {
  if (!db.online && !db.active) return fail(409, 'NOT_TRACKING');
  db.location = { lat, lng, at };
  return { ok: true, value: undefined };
}
