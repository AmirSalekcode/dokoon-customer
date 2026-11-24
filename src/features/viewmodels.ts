/**
 * API object → component props. Components stay presentational; all formatting
 * (Persian digits, money, ETA text) happens here so every screen formats the same way.
 */
import type { Food, OptionGroup, Restaurant, RestaurantCard } from '@/api/types';
import type { RestaurantCardData } from '@/components/library/RestaurantCard';
import type { RestaurantHeaderData } from '@/components/library/RestaurantHeader';
import type { FoodCardData } from '@/components/library/FoodCard';
import type { FoodGroupVM } from '@/components/library/FoodDetails';
import { discountBadge, discountPercent, endsText, isActive } from '@/lib/discount';
import { formatDecimal, formatEtaRange, formatNumber, toFaDigits } from '@/lib/format';

export function feeText(fee: number | undefined): { text: string; free: boolean } {
  if (!fee) return { text: 'ارسال رایگان', free: true };
  return { text: `${formatNumber(fee)} تومان`, free: false };
}

export function toRestaurantCardVM(r: RestaurantCard): RestaurantCardData {
  const fee = feeText(r.fee);
  return {
    name: r.name ?? '',
    sub: r.sub,
    art: r.coverUrl,
    km: r.distanceKm != null ? formatDecimal(r.distanceKm) : undefined,
    rating: r.rating ? formatDecimal(r.rating) : undefined,
    reviews: r.reviews != null ? formatNumber(r.reviews) : undefined,
    eta: r.etaMin != null && r.etaMax != null ? formatEtaRange(r.etaMin, r.etaMax) : undefined,
    feeText: fee.text,
    free: fee.free,
    badge: r.badge?.text,
    badgeTone: r.badge?.tone,
    isOpen: r.open,
    fav: r.isFavorite,
  };
}

export function toRestaurantHeaderVM(r: Restaurant): RestaurantHeaderData {
  const c = toRestaurantCardVM(r);
  return {
    ...c,
    cover: r.coverUrl,
    art: r.coverUrl,
    feeShort: r.fee ? formatNumber(r.fee) : 'رایگان',
    hours: r.hours,
    opensNext: r.opensNext,
    offer: r.offer || undefined,
  };
}

/** Option groups visible for a restaurant (extras hidden when allowExtras = false). */
export function visibleGroups(f: Food, allowExtras: boolean): OptionGroup[] {
  return (f.optionGroups ?? []).filter((g) => allowExtras || !g.isExtra);
}

/** Running food discount (D-131) as shown to the customer; undefined when there is none. */
export interface FoodDiscountVM {
  percent: number;
  /** «۱۰٪ تخفیف» / «جشنواره ۱۰٪» — built from `discount`, never hard-coded. */
  badge: string;
  /** «تا پایان امروز» / «تا ۳ روز دیگر» when the discount has an end. */
  ends?: string;
}

export function foodDiscountVM(f: Food, now: number = Date.now()): FoodDiscountVM | undefined {
  const d = f.discount;
  const price = f.price ?? 0;
  const old = f.oldPrice ?? 0;
  if (!d || !isActive(d.endsAt, now) || !price || old <= price) return undefined;
  const percent = d.percent || discountPercent(old, price);
  const ends = endsText(d.endsAt, now);
  return { percent, badge: discountBadge(percent, d.label), ...(ends ? { ends } : {}) };
}

/** Unit price before the discount (base + options) for the cart's struck price; undefined without one. */
export function oldUnitPriceWith(
  f: Food,
  groups: OptionGroup[],
  sel: Selection,
  now: number = Date.now(),
): number | undefined {
  if (!foodDiscountVM(f, now)) return undefined;
  return unitPriceWith(f, groups, sel) - (f.price ?? 0) + (f.oldPrice ?? 0);
}

export function toFoodCardVM(f: Food, opts: { orderable: boolean; allowExtras: boolean }): FoodCardData {
  return {
    name: f.title ?? '',
    desc: f.desc,
    art: f.imageUrl,
    price: f.price ?? 0,
    oldPrice: f.oldPrice,
    discount: foodDiscountVM(f),
    available: f.available,
    orderable: opts.orderable,
    hasGroups: visibleGroups(f, opts.allowExtras).length > 0,
  };
}

/** Selection state for option groups: groupId → selected option ids. */
export type Selection = Record<string, string[]>;

export function groupTag(g: OptionGroup): string {
  if (g.required) return 'الزامی';
  if (g.max && g.max > 1) return `اختیاری، تا ${toFaDigits(g.max)} مورد`;
  return 'اختیاری';
}

export function requiredSatisfied(groups: OptionGroup[], sel: Selection): boolean {
  return groups.every((g) => !g.required || (sel[g.id!]?.length ?? 0) >= Math.max(1, g.min ?? 1));
}

export function toggleOption(g: OptionGroup, sel: Selection, optionId: string): Selection {
  const cur = sel[g.id!] ?? [];
  const max = g.max ?? 1;
  let next: string[];
  if (max <= 1) next = cur[0] === optionId && !g.required ? [] : [optionId];
  else if (cur.includes(optionId)) next = cur.filter((x) => x !== optionId);
  else if (cur.length < max) next = [...cur, optionId];
  else next = cur;
  return { ...sel, [g.id!]: next };
}

export function unitPriceWith(f: Food, groups: OptionGroup[], sel: Selection): number {
  const deltas = groups.flatMap((g) =>
    (g.options ?? []).filter((o) => sel[g.id!]?.includes(o.id!)).map((o) => o.priceDelta ?? 0),
  );
  return (f.price ?? 0) + deltas.reduce((a, b) => a + b, 0);
}

export function toFoodGroupsVM(
  groups: OptionGroup[],
  sel: Selection,
  onPick: (g: OptionGroup, optionId: string) => void,
): FoodGroupVM[] {
  return groups.map((g) => ({
    id: g.id!,
    title: g.title ?? '',
    required: g.required,
    multi: (g.max ?? 1) > 1,
    tag: groupTag(g),
    options: (g.options ?? []).map((o) => ({
      id: o.id!,
      name: o.title ?? '',
      priceText: o.priceDelta ? `+${formatNumber(o.priceDelta)} تومان` : 'رایگان',
      selected: sel[g.id!]?.includes(o.id!),
      disabled: o.available === false,
      onPick: () => onPick(g, o.id!),
    })),
  }));
}
