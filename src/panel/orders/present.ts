import { formatMoney, toFaDigits } from '@/lib/format';
import type { Order, OrderStatus } from '../api/types';

/**
 * Pure mapping of contract orders to what the order screens show (labels, tones, texts, the main action).
 * Every Persian string of the orders UI lives here so tiles, the detail and the alert agree.
 */
export type OrderTone = 'new' | 'prep' | 'ready' | 'way' | 'done' | 'bad';
export type ActionKind = 'accept' | 'ready' | 'handover';
export interface PrimaryAction {
  kind: ActionKind;
  label: string;
  /** Button colour: new = orange, ok = status-ready, dark = status-way. */
  tone: 'new' | 'ok' | 'dark';
}

const STATUS: Record<OrderStatus, [string, OrderTone]> = {
  new: ['جدید', 'new'],
  prep: ['در حال آماده‌سازی', 'prep'],
  ready: ['آماده تحویل به پیک', 'ready'],
  way: ['در مسیر مشتری', 'way'],
  done: ['تحویل شد', 'done'],
  rejected: ['رد شد', 'bad'],
  cancelled: ['لغو شد', 'bad'],
  expired: ['بی‌پاسخ لغو شد', 'bad'],
};

export const statusLabel = (o: Order) => STATUS[o.status ?? 'new'][0];
export const statusTone = (o: Order): OrderTone => STATUS[o.status ?? 'new'][1];

/** The one action of the current step (card button and detail main button). */
export function primaryAction(o: Order): PrimaryAction | null {
  switch (o.status) {
    case 'new':
      return { kind: 'accept', label: 'پذیرش سفارش', tone: 'new' };
    case 'prep':
      return { kind: 'ready', label: 'سفارش آماده است', tone: 'ok' };
    case 'ready':
      return { kind: 'handover', label: 'تحویل به پیک شد', tone: 'dark' };
    default:
      return null;
  }
}

/** Reject (new) / cancel (prep) is the secondary action of those two steps. */
export const canReject = (o: Order) => o.status === 'new' || o.status === 'prep';

export const itemsText = (o: Order) =>
  (o.items ?? []).map((i) => `${toFaDigits(i.qty ?? 1)}× ${i.name ?? ''}`).join('، ');

export const payLabel = (o: Order) => (o.payment === 'cash' ? 'نقدی هنگام تحویل' : 'پرداخت آنلاین');
export const payText = (o: Order) =>
  o.payment === 'cash' ? 'نقدی هنگام تحویل؛ پیک از مشتری می‌گیرد' : 'پرداخت آنلاین انجام شده است';

export const totalText = (o: Order) => formatMoney(o.foodsTotal ?? 0);
export const orderNo = (o: Order) => `#${toFaDigits(o.no ?? '')}`;

const timeFmt = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });
const dateFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' });
const MIN = 60_000;

/** «همین الان» / «۵ دقیقه پیش» within the hour, then the clock time; another day adds the date. */
export function agoText(iso: string | undefined, now: number): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const m = Math.floor((now - t) / MIN);
  if (m < 1) return 'همین الان';
  if (m < 60) return `${toFaDigits(m)} دقیقه پیش`;
  const d = new Date(t);
  const sameDay = new Date(now).toDateString() === d.toDateString();
  return sameDay ? `ساعت ${timeFmt.format(d)}` : `${dateFmt.format(d)}، ${timeFmt.format(d)}`;
}

/** Seconds left to answer a new order (0 when the deadline passed or is unknown). */
export function secondsLeft(o: Order, now: number): number {
  if (o.status !== 'new' || !o.acceptDeadline) return 0;
  return Math.max(0, Math.ceil((Date.parse(o.acceptDeadline) - now) / 1000));
}

/** «۲:۰۵» */
export const clockText = (sec: number) =>
  toFaDigits(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);

/** Small line under the items: answer deadline (new), prep time (prep), reason (rejected/cancelled). */
export function extraText(o: Order, now: number): string {
  switch (o.status) {
    case 'new': {
      const s = secondsLeft(o, now);
      return s > 0 ? `مهلت پاسخ: ${clockText(s)}` : '';
    }
    case 'prep':
      return o.prepMinutes ? `زمان آماده‌سازی: ${toFaDigits(o.prepMinutes)} دقیقه` : '';
    case 'ready':
    case 'way':
      return o.courier?.name
        ? toFaDigits(`پیک: ${o.courier.name}${o.courier.statusText ? ` · ${o.courier.statusText}` : ''}`)
        : '';
    case 'rejected':
    case 'cancelled':
      return o.rejectReason ? `دلیل: ${o.rejectReason}` : '';
    case 'expired':
      return 'در مهلت پاسخ داده نشد';
    default:
      return '';
  }
}

const placed = (o: Order) => Date.parse(o.placedAt ?? '') || 0;
const STEP: Partial<Record<OrderStatus, number>> = { new: 0, prep: 1, ready: 2, way: 3 };

/**
 * Live tabs: earliest step first (ready before way), then oldest first, so the order closest to its
 * deadline or to the courier is on top.
 */
export function sortLive(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => (STEP[a.status!] ?? 9) - (STEP[b.status!] ?? 9) || placed(a) - placed(b));
}

/** OrderTile view props of an order. */
export function tileView(o: Order, now: number) {
  return {
    no: orderNo(o),
    name: o.customerName ?? '',
    itemsText: itemsText(o),
    total: totalText(o),
    statusLabel: statusLabel(o),
    tone: statusTone(o),
    timeText: agoText(o.placedAt, now),
    pay: o.payment === 'cash' ? ('cash' as const) : ('online' as const),
    payLabel: payLabel(o),
    extraText: extraText(o, now),
  };
}
