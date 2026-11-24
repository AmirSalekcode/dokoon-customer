import { describe, expect, it, vi } from 'vitest';
import {
  chipPrice,
  DISCOUNT_CHIPS,
  discountCheck,
  dishErrors,
  draftFromFood,
  foodInput,
  groupDraft,
  groupErrors,
  groupFromDraft,
  groupRule,
  liveDiscount,
  optionPriceText,
  parseToman,
  type DishDraft,
} from './dish';

// KAN-67: dish and option-group validation (screen specs §3).
const dish = (p: Partial<DishDraft> = {}): DishDraft => ({
  ...draftFromFood(undefined, 'kebab'),
  name: 'کباب',
  price: '200000',
  ...p,
});

describe('parseToman', () => {
  it('accepts Persian digits and separators', () => {
    expect(parseToman('۲۸۵٬۰۰۰')).toBe(285000);
    expect(parseToman('285,000')).toBe(285000);
    expect(parseToman('')).toBeNull();
    expect(parseToman('12a')).toBeNaN();
  });
});

describe('dishErrors', () => {
  it('a valid dish has no errors', () => {
    expect(dishErrors(dish())).toEqual({});
  });
  it('name ≥ 2, price > 0, category required', () => {
    expect(dishErrors(dish({ name: ' ک ', price: '0', categoryId: '' }))).toEqual({
      name: 'نام غذا حداقل ۲ حرف است',
      price: 'قیمت را به تومان بنویسید',
      categoryId: 'یک دسته انتخاب کنید',
    });
    expect(dishErrors(dish({ price: '' })).price).toBeDefined();
    expect(dishErrors(dish({ price: 'abc' })).price).toBeDefined();
  });
});

describe('foodInput', () => {
  it('trims, parses prices and sends groups only with extras on', () => {
    const d = dish({ name: ' کباب برگ ', price: '۳۹۵۰۰۰', groups: [{ title: 'x', options: [] }] });
    expect(foodInput(d, true)).toMatchObject({
      name: 'کباب برگ',
      price: 395000,
      discount: null,
      groups: [{ title: 'x' }],
    });
    expect(foodInput(d, true)).not.toHaveProperty('oldPrice');
    expect(foodInput(d, false)).not.toHaveProperty('groups');
  });
});

// KAN-109 (D-131): «تخفیف ویژه» section of the dish editor.
describe('discount section', () => {
  const NOW = Date.parse('2026-11-24T09:00:00+03:30');
  const on = (p: Partial<DishDraft> = {}) =>
    dish({ price: '300000', discountOn: true, discountPrice: '270000', ...p });

  it('is off for a new dish and off means no discount', () => {
    const d = dish();
    expect(d).toMatchObject({ discountOn: false, discountLabel: 'special', discountDuration: 'none' });
    expect(foodInput(dish({ discountPrice: '100000' }), false).discount).toBeNull();
    expect(discountCheck(d)).toBeNull();
  });

  it('chips fill a round price for that percent of the current price', () => {
    expect(DISCOUNT_CHIPS).toEqual([10, 15, 20, 25, 30]);
    expect(chipPrice(dish({ price: '300000' }), 10)).toBe('270000');
    expect(chipPrice(dish({ price: '۲۸۵٬۰۰۰' }), 15)).toBe('242000');
    expect(chipPrice(dish({ price: '' }), 10)).toBe('');
  });

  it('validates the discounted price against the price (1..90%)', () => {
    expect(dishErrors(on())).toEqual({});
    expect(dishErrors(on({ discountPrice: '' })).discountPrice).toBe('قیمت با تخفیف را وارد کنید');
    expect(dishErrors(on({ discountPrice: '300000' })).discountPrice).toBe(
      'قیمت با تخفیف باید کمتر از قیمت اصلی باشد',
    );
    expect(dishErrors(on({ discountPrice: '299000' })).discountPrice).toBe('تخفیف باید دست‌کم ۱٪ باشد');
    expect(dishErrors(on({ discountPrice: '26000' })).discountPrice).toBe(
      'تخفیف نمی‌تواند بیشتر از ۹۰٪ باشد',
    );
  });

  it('asks for confirmation above 50%', () => {
    expect(discountCheck(on({ discountPrice: '150000' }))).toEqual({ percent: 50, confirm: false });
    expect(discountCheck(on({ discountPrice: '120000' }))).toEqual({ percent: 60, confirm: true });
  });

  it('a new base price recomputes the percent, and errors when the discount is no longer below it', () => {
    expect(discountCheck(on({ price: '540000' }))?.percent).toBe(50);
    expect(dishErrors(on({ price: '260000' })).discountPrice).toBe(
      'قیمت با تخفیف باید کمتر از قیمت اصلی باشد',
    );
    // No base price yet: the price field shows its own error, not the discount.
    expect(dishErrors(on({ price: '' }))).toEqual({ price: 'قیمت را به تومان بنویسید' });
  });

  it('sends base price + discount with the label and the end of the chosen duration', () => {
    const body = (p: Partial<DishDraft>) => foodInput(on(p), false, NOW).discount;
    expect(body({})).toEqual({ price: 270000, label: 'special', endsAt: null });
    expect(body({ discountLabel: 'festival', discountDuration: 'today' })).toEqual({
      price: 270000,
      label: 'festival',
      endsAt: '2026-11-24T20:29:59.000Z',
    });
    expect(body({ discountDuration: '3d' })?.endsAt).toBe('2026-11-27T05:30:00.000Z');
    expect(body({ discountDuration: '7d' })?.endsAt).toBe('2026-12-01T05:30:00.000Z');
    expect(body({ discountDuration: 'date', discountDay: '2026-12-10' })?.endsAt).toBe(
      '2026-12-10T20:29:59.000Z',
    );
    expect(foodInput(on(), false, NOW).price).toBe(300000);
  });

  it('«تاریخ دلخواه» needs a day', () => {
    expect(dishErrors(on({ discountDuration: 'date' })).discountDay).toBe('روز پایان تخفیف را انتخاب کنید');
    expect(
      dishErrors(on({ discountDuration: 'date', discountDay: '2026-12-10' })).discountDay,
    ).toBeUndefined();
    // Off: the day does not matter.
    expect(dishErrors(dish({ discountDuration: 'date' })).discountDay).toBeUndefined();
  });
});

describe('draft ↔ FoodInput with a loaded discount', () => {
  const NOW = Date.parse('2026-11-24T09:00:00+03:30');
  const festival = { price: 270000, label: 'festival' as const, endsAt: '2026-11-27T09:00:00+03:30' };

  it('loads a running discount and keeps its end («پایان فعلی»)', () => {
    vi.useFakeTimers({ now: NOW });
    try {
      const d = draftFromFood({ id: 'x', name: 'برگ', price: 300000, discount: festival });
      expect(d).toMatchObject({
        price: '300000',
        discountOn: true,
        discountPrice: '270000',
        discountLabel: 'festival',
        discountDuration: 'keep',
      });
      expect(foodInput(d, false)).toMatchObject({ price: 300000, discount: festival });
      // A discount without an end loads as «بدون پایان».
      const open = draftFromFood({
        id: 'y',
        name: 'برگ',
        price: 300000,
        discount: { ...festival, endsAt: null },
      });
      expect(open.discountDuration).toBe('none');
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores an ended discount', () => {
    vi.useFakeTimers({ now: NOW });
    try {
      const ended = { ...festival, endsAt: '2026-11-23T09:00:00+03:30' };
      expect(liveDiscount({ discount: ended })).toBeNull();
      const d = draftFromFood({ id: 'x', name: 'برگ', price: 300000, discount: ended });
      expect(d).toMatchObject({ price: '300000', discountOn: false, discount: null });
      expect(foodInput(d, false)).toMatchObject({ price: 300000, discount: null });
    } finally {
      vi.useRealTimers();
    }
  });

  it('switching the discount off removes it', () => {
    const d = {
      ...draftFromFood({ id: 'x', name: 'برگ', price: 300000, discount: festival }),
      discountOn: false,
    };
    expect(foodInput(d, false).discount).toBeNull();
  });
});

describe('option groups', () => {
  it('rule text', () => {
    expect(groupRule({ required: true, max: 1 })).toBe('انتخاب ۱ مورد · اجباری');
    expect(groupRule({ required: false, max: 3 })).toBe('تا ۳ مورد · اختیاری');
    expect(optionPriceText(0)).toBe('رایگان');
    expect(optionPriceText(45000)).toBe('+۴۵٬۰۰۰ تومان');
  });

  it('needs a title and one named option; prices are numbers', () => {
    const g = groupDraft(undefined);
    expect(groupErrors(g)).toEqual({
      title: 'عنوان گروه حداقل ۲ حرف است',
      options: 'حداقل یک گزینه با نام لازم است',
    });
    g.title = 'نوشیدنی';
    g.options[0].name = 'دوغ';
    expect(groupErrors(g)).toEqual({});
    g.options[0].price = 'ده';
    expect(groupErrors(g).options).toBe('قیمت گزینه‌ها فقط عدد به تومان است');
  });

  it('drops unnamed rows; empty price = free; keeps ids', () => {
    const g = groupDraft({
      id: 'drink',
      title: 'نوشیدنی',
      required: false,
      max: 9,
      options: [{ id: 'a', name: 'دوغ', price: 25000 }],
    });
    expect(g.max).toBe(8);
    g.options.push({ key: 'x', name: '  ', price: '5' }, { key: 'y', name: 'آب', price: '' });
    expect(groupFromDraft(g)).toEqual({
      id: 'drink',
      title: 'نوشیدنی',
      required: false,
      max: 8,
      options: [
        { id: 'a', name: 'دوغ', price: 25000 },
        { name: 'آب', price: 0 },
      ],
    });
  });
});
