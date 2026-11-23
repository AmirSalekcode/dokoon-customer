import { toFaDigits } from './format';

/**
 * Per-food discount / festival (D-131, KAN-108), shared by the restaurant panel and the customer app.
 * The server is the authority (it validates, ends discounts at `endsAt` and prices the cart); this module
 * only computes what the UI shows and pre-checks the panel form with the same rules.
 *
 * Percent is always ROUNDED DOWN (۳۲۰٬۰۰۰ → ۲۸۵٬۰۰۰ is «۱۰٪», never «۱۱٪»), and every range check uses that
 * same displayed percent so the form and the badge never disagree.
 * Calendar days are Tehran days (fixed UTC+03:30; Iran has no DST since 2022).
 */

export type DiscountLabel = 'special' | 'festival';
export type DiscountDuration = 'none' | 'today' | '3d' | '7d';

export const DISCOUNT_MIN_PERCENT = 1;
export const DISCOUNT_MAX_PERCENT = 90;
/** Above this the panel asks «تخفیف بیش از ۵۰٪ است؛ مطمئنید؟». */
export const DISCOUNT_CONFIRM_PERCENT = 50;

const DAY = 86_400_000;
const TEHRAN_OFFSET = 3.5 * 3_600_000;
const tehranDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' });
const jalaliDayMonth = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'Asia/Tehran',
  day: 'numeric',
  month: 'long',
});

const valid = (n: number) => Number.isFinite(n) && n > 0;

/** Whole percent off `base` (rounded down). 0 when there is no real discount. Integer math, no float error. */
export function discountPercent(base: number, price: number): number {
  if (!valid(base) || !valid(price) || price >= base) return 0;
  return Math.floor(((base - price) * 100) / base);
}

/**
 * Discounted price for a quick chip (۱۰٪ … ۳۰٪): the roundest price (to 1000, else 100, else 1 toman) that
 * still shows exactly `percent`.
 */
export function priceForPercent(base: number, percent: number): number {
  if (!valid(base)) return 0;
  const exact = Math.floor((base * (100 - percent)) / 100);
  for (const step of [1000, 100, 1]) {
    const p = Math.floor(exact / step) * step;
    if (p > 0 && discountPercent(base, p) === percent) return p;
  }
  return exact;
}

export interface DiscountCheck {
  percent: number;
  /** Set when the form must not be saved. */
  error?: string;
  /** True above 50%: ask before saving. */
  confirm: boolean;
}

/** Panel form check for «قیمت با تخفیف» against the base price (same rules as the server). */
export function validateDiscount(base: number, price: number): DiscountCheck {
  if (!valid(base)) return { percent: 0, confirm: false };
  if (!valid(price)) return { percent: 0, confirm: false, error: 'قیمت با تخفیف را وارد کنید' };
  if (price >= base)
    return { percent: 0, confirm: false, error: 'قیمت با تخفیف باید کمتر از قیمت اصلی باشد' };
  const percent = discountPercent(base, price);
  if (percent < DISCOUNT_MIN_PERCENT)
    return { percent, confirm: false, error: `تخفیف باید دست‌کم ${toFaDigits(DISCOUNT_MIN_PERCENT)}٪ باشد` };
  if (percent > DISCOUNT_MAX_PERCENT)
    return {
      percent,
      confirm: false,
      error: `تخفیف نمی‌تواند بیشتر از ${toFaDigits(DISCOUNT_MAX_PERCENT)}٪ باشد`,
    };
  return { percent, confirm: percent > DISCOUNT_CONFIRM_PERCENT };
}

/** A discount without an end is active; one with an unreadable or past `endsAt` is not. */
export function isActive(endsAt: string | null | undefined, now: number = Date.now()): boolean {
  if (endsAt == null) return true;
  const t = Date.parse(endsAt);
  return !Number.isNaN(t) && t > now;
}

/** Days between two instants counted on the Tehran calendar. */
function tehranDayDiff(from: number, to: number): number {
  const day = (t: number) => Date.parse(`${tehranDay.format(t)}T00:00:00Z`);
  return Math.round((day(to) - day(from)) / DAY);
}

/** «تا پایان امروز» / «تا فردا» / «تا ۳ روز دیگر» / «تا ۱۱ آذر»; empty without an end or once ended. */
export function endsText(endsAt: string | null | undefined, now: number = Date.now()): string {
  if (endsAt == null || !isActive(endsAt, now)) return '';
  const t = Date.parse(endsAt);
  const days = tehranDayDiff(now, t);
  if (days <= 0) return 'تا پایان امروز';
  if (days === 1) return 'تا فردا';
  if (days <= 7) return `تا ${toFaDigits(days)} روز دیگر`;
  return `تا ${jalaliDayMonth.format(t)}`;
}

/** `endsAt` for a duration preset in the panel. Starts are always immediate (D-131). */
export function discountEndsAt(duration: DiscountDuration, now: number = Date.now()): string | null {
  switch (duration) {
    case 'none':
      return null;
    case 'today': {
      const midnightUtc = Date.parse(`${tehranDay.format(now)}T00:00:00Z`);
      return new Date(midnightUtc - TEHRAN_OFFSET + DAY - 1000).toISOString();
    }
    case '3d':
      return new Date(now + 3 * DAY).toISOString();
    case '7d':
      return new Date(now + 7 * DAY).toISOString();
  }
}

/** Badge text: «۱۰٪ تخفیف» or «جشنواره ۱۰٪». */
export function discountBadge(percent: number, label: DiscountLabel): string {
  const pct = `${toFaDigits(percent)}٪`;
  return label === 'festival' ? `جشنواره ${pct}` : `${pct} تخفیف`;
}
