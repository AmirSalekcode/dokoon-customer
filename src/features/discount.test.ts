import { describe, expect, it } from 'vitest';
import type { Food, Quote } from '@/api/types';
import type { CartLine } from '@/cart/cart';
import { repricedLines } from './checkout';
import { foodDiscountVM, oldUnitPriceWith, toFoodCardVM } from './viewmodels';

// KAN-110 (D-131): customer view of a per-food discount.
const NOW = Date.parse('2026-11-24T09:00:00+03:30');
const special: Food = {
  id: 'n1',
  title: 'کوبیده',
  price: 270000,
  oldPrice: 300000,
  discount: { percent: 10, label: 'special', endsAt: null },
};
const festival: Food = {
  ...special,
  id: 'b1',
  discount: { percent: 10, label: 'festival', endsAt: '2026-11-27T09:00:00+03:30' },
};

describe('foodDiscountVM', () => {
  it('builds the badge from the discount, not hard-coded', () => {
    expect(foodDiscountVM(special, NOW)).toEqual({ percent: 10, badge: '۱۰٪ تخفیف' });
    expect(foodDiscountVM(festival, NOW)).toEqual({
      percent: 10,
      badge: 'جشنواره ۱۰٪',
      ends: 'تا ۳ روز دیگر',
    });
  });

  it('no discount, an ended one, or a price that is not lower → nothing', () => {
    expect(foodDiscountVM({ ...special, discount: null, oldPrice: null }, NOW)).toBeUndefined();
    expect(
      foodDiscountVM(
        { ...festival, discount: { ...festival.discount!, endsAt: '2026-11-20T00:00:00Z' } },
        NOW,
      ),
    ).toBeUndefined();
    expect(foodDiscountVM({ ...special, oldPrice: 270000 }, NOW)).toBeUndefined();
  });

  it('falls back to the computed percent when the server omits it', () => {
    const f = { ...special, price: 285000, oldPrice: 320000, discount: { ...special.discount!, percent: 0 } };
    expect(foodDiscountVM(f, NOW)?.badge).toBe('۱۰٪ تخفیف');
  });

  it('FoodCard view model carries the discount; a plain food has none', () => {
    const opts = { orderable: true, allowExtras: true };
    expect(toFoodCardVM(special, opts)).toMatchObject({
      price: 270000,
      oldPrice: 300000,
      discount: { percent: 10, badge: '۱۰٪ تخفیف' },
    });
    expect(toFoodCardVM({ id: 'x', title: 'دوغ', price: 25000 }, opts).discount).toBeUndefined();
  });
});

describe('cart old price', () => {
  it('old unit price = base price + options, only while discounted', () => {
    const groups = [{ id: 'g', options: [{ id: 'o', priceDelta: 20000 }] }];
    expect(oldUnitPriceWith(special, groups, { g: ['o'] }, NOW)).toBe(320000);
    expect(oldUnitPriceWith({ ...special, discount: null, oldPrice: null }, groups, {}, NOW)).toBeUndefined();
  });
});

describe('repricedLines (quote vs cart, D-66)', () => {
  const line = (p: Partial<CartLine>): CartLine => ({
    lineId: 'n1',
    foodId: 'n1',
    title: 'کوبیده',
    unitPrice: 270000,
    qty: 1,
    options: [],
    ...p,
  });
  const quote = (...unit: number[]): Quote => ({
    lines: unit.map((u, i) => ({ foodId: i ? 'b1' : 'n1', unitPrice: u, qty: 1, total: u })),
  });

  it('nothing when the server agrees', () => {
    expect(repricedLines([line({})], quote(270000))).toEqual([]);
  });

  it('a discount that ended: the line takes the server price', () => {
    const lines = [line({ oldUnitPrice: 300000 }), line({ lineId: 'b1', foodId: 'b1', unitPrice: 50000 })];
    expect(repricedLines(lines, quote(300000, 50000))).toEqual([{ lineId: 'n1', unitPrice: 300000 }]);
  });

  it('ignores a quote that does not match the cart lines (stale or reordered)', () => {
    expect(repricedLines([line({})], quote(300000, 1))).toEqual([]);
    expect(repricedLines([line({ foodId: 'zz' })], quote(300000))).toEqual([]);
    expect(repricedLines([line({})], { lines: [] })).toEqual([]);
    expect(repricedLines([line({})], null)).toEqual([]);
  });
});
