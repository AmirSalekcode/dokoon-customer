import { createApi } from '@/api/client';
import type { Food } from '@/api/types';
import { discountPercent } from '@/lib/discount';
import * as D from './data';

// KAN-108 (D-131): customer mock follows the contract-notes §39 proposal.
const base = 'http://localhost/api/v1';

describe('customer mock — food discounts', () => {
  it('discounted foods carry percent, label and the base price as oldPrice', () => {
    const discounted = D.foods.filter((f) => f.discount);
    expect(discounted.map((f) => [f.id, f.discount?.label])).toEqual([
      ['n1', 'special'],
      ['b1', 'festival'],
    ]);
    for (const f of discounted) expect(f.discount?.percent).toBe(discountPercent(f.oldPrice!, f.price!));
    const fest = D.foods.find((f) => f.id === 'b1')!;
    const days = (Date.parse(fest.discount!.endsAt!) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(2.9);
    expect(days).toBeLessThanOrEqual(3);
    // Foods without a discount have no old price.
    expect(D.foods.filter((f) => !f.discount).every((f) => f.oldPrice == null)).toBe(true);
  });

  it('an ended discount is removed: the base price comes back', () => {
    const f: Food = {
      id: 'x',
      price: 270000,
      oldPrice: 300000,
      discount: { percent: 10, label: 'festival', endsAt: '2026-11-24T09:00:00Z' },
    };
    const before = Date.parse('2026-11-24T08:59:59Z');
    const after = Date.parse('2026-11-24T09:00:00Z');
    expect(D.liveFood(f, before)).toBe(f);
    expect(D.liveFood(f, after)).toMatchObject({ price: 300000, oldPrice: null, discount: null });
  });

  it('restaurants with a discounted food show «تا X٪ تخفیف» and are in hasDiscount', async () => {
    expect(D.maxFoodDiscount('naghsh')).toBe(10);
    expect(D.maxFoodDiscount('burger')).toBe(20);
    expect(D.maxFoodDiscount('cafe')).toBe(0);
    const badge = (id: string) => D.restaurantCards.find((r) => r.id === id)?.badge;
    expect(badge('naghsh')).toEqual({ text: 'تا ۱۰٪ تخفیف', tone: 'red' });
    expect(badge('burger')).toEqual({ text: 'تا ۲۰٪ تخفیف', tone: 'red' });
    expect(badge('cafe')?.text).toBe('جدید');

    const api = createApi(base);
    const { data } = await api.GET('/restaurants', { params: { query: { hasDiscount: true } } });
    expect(data?.items?.map((r) => r.id)).toEqual(['naghsh', 'burger']);
  });

  it('menu, food details and search return the discount; quote charges the discounted price', async () => {
    const api = createApi(base);
    const menu = await api.GET('/restaurants/{id}/menu', { params: { path: { id: 'burger' } } });
    const b1 = (menu.data as { foods?: Food[] }[] | undefined)?.[0].foods?.[0];
    expect(b1).toMatchObject({
      price: 260000,
      oldPrice: 325000,
      discount: { percent: 20, label: 'festival' },
    });

    const food = await api.GET('/foods/{id}', { params: { path: { id: 'n1' } } });
    expect((food.data as Food | undefined)?.discount).toEqual({
      percent: 10,
      label: 'special',
      endsAt: null,
    });

    const search = await api.GET('/search', { params: { query: { q: 'چیزبرگر' } } });
    expect((search.data?.foods?.[0]?.food as Food | undefined)?.discount?.percent).toBe(20);

    const quote = await api.POST('/checkout/quote', {
      body: {
        restaurantId: 'burger',
        addressId: 'a1',
        payMethod: 'online',
        lines: [{ foodId: 'b1', qty: 2 }],
      },
    });
    expect(quote.data?.lines?.[0]).toMatchObject({ unitPrice: 260000, total: 520000 });
  });
});
