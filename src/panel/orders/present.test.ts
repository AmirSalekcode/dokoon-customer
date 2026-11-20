import { describe, expect, it } from 'vitest';
import type { Order } from '../api/types';
import {
  agoText,
  clockText,
  extraText,
  primaryAction,
  secondsLeft,
  sortLive,
  statusLabel,
  tileView,
} from './present';

const NOW = Date.parse('2026-11-20T12:00:00Z');
const at = (minAgo: number) => new Date(NOW - minAgo * 60_000).toISOString();
const order = (p: Partial<Order>): Order => ({
  id: 'o1',
  no: '1248',
  status: 'new',
  placedAt: at(0),
  customerName: 'زهرا نوری',
  items: [
    { qty: 2, name: 'کوبیده', price: 500000 },
    { qty: 1, name: 'دوغ', price: 25000 },
  ],
  foodsTotal: 525000,
  payment: 'cash',
  ...p,
});

describe('order presentation', () => {
  it('labels, tones and the main action follow the step', () => {
    expect(primaryAction(order({ status: 'new' }))).toMatchObject({ kind: 'accept', tone: 'new' });
    expect(primaryAction(order({ status: 'prep' }))).toMatchObject({
      kind: 'ready',
      label: 'سفارش آماده است',
    });
    expect(primaryAction(order({ status: 'ready' }))).toMatchObject({ kind: 'handover', tone: 'dark' });
    expect(primaryAction(order({ status: 'way' }))).toBeNull();
    expect(primaryAction(order({ status: 'done' }))).toBeNull();
    expect(statusLabel(order({ status: 'expired' }))).toBe('بی‌پاسخ لغو شد');
  });

  it('tile texts are Persian (digits, money, payment)', () => {
    const v = tileView(order({}), NOW);
    expect(v.no).toBe('#۱۲۴۸');
    expect(v.itemsText).toBe('۲× کوبیده، ۱× دوغ');
    expect(v.total).toBe('۵۲۵٬۰۰۰ تومان');
    expect(v.payLabel).toBe('نقدی هنگام تحویل');
    expect(v.pay).toBe('cash');
    expect(v.timeText).toBe('همین الان');
  });

  it('relative time: minutes within the hour, then the clock', () => {
    expect(agoText(at(5), NOW)).toBe('۵ دقیقه پیش');
    expect(agoText(at(90), NOW)).toMatch(/^ساعت [۰-۹]{2}:[۰-۹]{2}$/);
    expect(agoText(at(60 * 30), NOW)).toContain('،');
    expect(agoText(undefined, NOW)).toBe('');
  });

  it('new orders count down to the answer deadline', () => {
    const o = order({ acceptDeadline: new Date(NOW + 125_000).toISOString() });
    expect(secondsLeft(o, NOW)).toBe(125);
    expect(clockText(125)).toBe('۲:۰۵');
    expect(extraText(o, NOW)).toBe('مهلت پاسخ: ۲:۰۵');
    expect(secondsLeft(o, NOW + 200_000)).toBe(0);
    expect(extraText(order({ status: 'prep', prepMinutes: 20 }), NOW)).toBe('زمان آماده‌سازی: ۲۰ دقیقه');
    expect(extraText(order({ status: 'rejected', rejectReason: 'شلوغ' }), NOW)).toBe('دلیل: شلوغ');
    expect(
      extraText(order({ status: 'ready', courier: { name: 'حسین', statusText: 'در راه · 3 دقیقه' } }), NOW),
    ).toBe('پیک: حسین · در راه · ۳ دقیقه');
  });

  it('live lists: ready before way, oldest first', () => {
    const list = sortLive([
      order({ id: 'w', status: 'way', placedAt: at(40) }),
      order({ id: 'r2', status: 'ready', placedAt: at(5) }),
      order({ id: 'r1', status: 'ready', placedAt: at(20) }),
    ]);
    expect(list.map((o) => o.id)).toEqual(['r1', 'r2', 'w']);
  });
});
