import { describe, expect, it } from 'vitest';
import {
  discountBadge,
  discountEndsAt,
  discountPercent,
  endsText,
  isActive,
  priceForPercent,
  validateDiscount,
} from './discount';

// KAN-108 (D-131): shared per-food discount logic for the panel and the customer app.
// Times are fixed instants; calendar days are Tehran days (UTC+03:30, no DST).
const at = (iso: string) => Date.parse(iso);
const NOW = at('2026-11-24T09:00:00+03:30'); // Tehran: 3 Azar 1405, morning

describe('discountPercent', () => {
  it.each([
    [300000, 270000, 10],
    [320000, 285000, 10], // 10.93 → 10 (rounded down)
    [300000, 299999, 0],
    [300000, 297000, 1],
    [300000, 30000, 90],
    [300000, 29999, 90], // 90.0003 → 90
    [300000, 29000, 90],
    [100000, 71000, 29], // no float error (0.29 * 100)
  ])('%d → %d = %d%%', (base, price, pct) => {
    expect(discountPercent(base, price)).toBe(pct);
  });

  it('is 0 for no discount or bad input', () => {
    expect(discountPercent(300000, 300000)).toBe(0);
    expect(discountPercent(300000, 310000)).toBe(0);
    expect(discountPercent(0, 0)).toBe(0);
    expect(discountPercent(300000, 0)).toBe(0);
    expect(discountPercent(Number.NaN, 1)).toBe(0);
  });
});

describe('priceForPercent', () => {
  it.each([
    [300000, 10, 270000],
    [300000, 15, 255000],
    [285000, 15, 242000], // rounded down to 1000 toman, still 15%
    [25000, 10, 22500], // 1000 step would give 8%, 100 step keeps 10%
    [999, 30, 699],
  ])('%d at %d%% → %d', (base, pct, price) => {
    expect(priceForPercent(base, pct)).toBe(price);
    expect(discountPercent(base, price)).toBe(pct);
  });

  it('returns 0 when the base price is missing', () => {
    expect(priceForPercent(0, 10)).toBe(0);
    expect(priceForPercent(Number.NaN, 10)).toBe(0);
  });
});

describe('validateDiscount', () => {
  it('accepts 1% up to 90%', () => {
    expect(validateDiscount(300000, 297000)).toEqual({ percent: 1, confirm: false });
    expect(validateDiscount(300000, 270000)).toEqual({ percent: 10, confirm: false });
    expect(validateDiscount(300000, 30000)).toEqual({ percent: 90, confirm: true });
  });

  it('asks for confirmation only above 50%', () => {
    expect(validateDiscount(300000, 150000).confirm).toBe(false); // exactly 50%
    expect(validateDiscount(300000, 149000)).toEqual({ percent: 50, confirm: false }); // 50.33 → 50
    expect(validateDiscount(300000, 147000)).toEqual({ percent: 51, confirm: true });
  });

  it('rejects a discounted price that is not below the base price', () => {
    expect(validateDiscount(300000, 300000).error).toBe('قیمت با تخفیف باید کمتر از قیمت اصلی باشد');
    expect(validateDiscount(300000, 350000).error).toBe('قیمت با تخفیف باید کمتر از قیمت اصلی باشد');
  });

  it('rejects less than 1% and more than 90%', () => {
    expect(validateDiscount(300000, 299000).error).toBe('تخفیف باید دست‌کم ۱٪ باشد');
    expect(validateDiscount(300000, 26000).error).toBe('تخفیف نمی‌تواند بیشتر از ۹۰٪ باشد'); // 91.3 → 91
    expect(validateDiscount(300000, 29000)).toEqual({ percent: 90, confirm: true }); // 90.3 → 90 is allowed
  });

  it('rejects an empty or zero discounted price', () => {
    expect(validateDiscount(300000, 0).error).toBe('قیمت با تخفیف را وارد کنید');
    expect(validateDiscount(300000, Number.NaN).error).toBe('قیمت با تخفیف را وارد کنید');
  });

  it('has no error without a valid base price (the base price field shows its own error)', () => {
    expect(validateDiscount(0, 1000)).toEqual({ percent: 0, confirm: false });
  });
});

describe('isActive', () => {
  it('is active without an end', () => {
    expect(isActive(null, NOW)).toBe(true);
    expect(isActive(undefined, NOW)).toBe(true);
  });

  it('ends at endsAt', () => {
    expect(isActive('2026-11-24T09:00:01+03:30', NOW)).toBe(true);
    expect(isActive('2026-11-24T09:00:00+03:30', NOW)).toBe(false);
    expect(isActive('2026-11-20T00:00:00Z', NOW)).toBe(false);
  });

  it('treats an unreadable date as ended', () => {
    expect(isActive('soon', NOW)).toBe(false);
  });
});

describe('endsText', () => {
  it('is empty without an end, or once ended', () => {
    expect(endsText(null, NOW)).toBe('');
    expect(endsText(undefined, NOW)).toBe('');
    expect(endsText('2026-11-23T23:00:00+03:30', NOW)).toBe('');
    expect(endsText('bad', NOW)).toBe('');
  });

  it('says today for the same Tehran day', () => {
    expect(endsText('2026-11-24T23:59:59+03:30', NOW)).toBe('تا پایان امروز');
    expect(endsText('2026-11-24T10:00:00+03:30', NOW)).toBe('تا پایان امروز');
  });

  it('uses Tehran days, not UTC days', () => {
    // 02:00 Tehran on the 25th is still the 24th in UTC.
    expect(endsText('2026-11-25T02:00:00+03:30', NOW)).toBe('تا فردا');
    const lateNight = at('2026-11-24T23:30:00+03:30'); // 20:00 UTC
    expect(endsText('2026-11-25T01:00:00+03:30', lateNight)).toBe('تا فردا');
  });

  it('counts days up to a week with Persian digits', () => {
    expect(endsText('2026-11-27T09:00:00+03:30', NOW)).toBe('تا ۳ روز دیگر');
    expect(endsText('2026-12-01T09:00:00+03:30', NOW)).toBe('تا ۷ روز دیگر');
  });

  it('shows the Jalali date beyond a week', () => {
    expect(endsText('2026-12-02T12:00:00+03:30', NOW)).toBe('تا ۱۱ آذر');
    expect(endsText('2027-01-10T12:00:00+03:30', NOW)).toBe('تا ۲۰ دی');
  });
});

describe('discountEndsAt', () => {
  it('has no end for «بدون پایان»', () => {
    expect(discountEndsAt('none', NOW)).toBeNull();
  });

  it('ends at the last second of today in Tehran', () => {
    expect(discountEndsAt('today', NOW)).toBe('2026-11-24T20:29:59.000Z');
    expect(endsText(discountEndsAt('today', NOW), NOW)).toBe('تا پایان امروز');
  });

  it('ends 3 or 7 days from now', () => {
    expect(discountEndsAt('3d', NOW)).toBe('2026-11-27T05:30:00.000Z');
    expect(endsText(discountEndsAt('3d', NOW), NOW)).toBe('تا ۳ روز دیگر');
    expect(endsText(discountEndsAt('7d', NOW), NOW)).toBe('تا ۷ روز دیگر');
  });
});

describe('discountBadge', () => {
  it('builds the badge from percent and label', () => {
    expect(discountBadge(10, 'special')).toBe('۱۰٪ تخفیف');
    expect(discountBadge(25, 'festival')).toBe('جشنواره ۲۵٪');
  });
});
