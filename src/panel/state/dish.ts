import { create } from 'zustand';
import { isActive } from '@/lib/discount';
import { formatMoney, normalizeDigits, toFaDigits } from '@/lib/format';
import type { Food, FoodDiscount, FoodInput, OptionGroup } from '../api/types';

/** The food's discount while it is running (D-131); the server also drops it at `endsAt`. */
export function liveDiscount(f: Pick<Food, 'discount'>, now: number = Date.now()): FoodDiscount | null {
  return f.discount && isActive(f.discount.endsAt, now) ? f.discount : null;
}

/** Default illustrations a dish can use until (or instead of) a real photo. */
export const DISH_ARTS: readonly { art: string; label: string }[] = [
  { art: 'dk-kebab', label: 'کباب' },
  { art: 'dk-chelo', label: 'چلو' },
  { art: 'dk-stew', label: 'خورش' },
  { art: 'dk-rice', label: 'برنج' },
  { art: 'dk-salad', label: 'سالاد' },
  { art: 'dk-drink', label: 'نوشیدنی' },
  { art: 'dk-burger', label: 'برگر' },
  { art: 'dk-pizza', label: 'پیتزا' },
  { art: 'dk-fries', label: 'سیب‌زمینی' },
  { art: 'dk-cake', label: 'دسر' },
  { art: 'dk-cafe', label: 'کافه' },
];

export const GROUP_MAX_MIN = 1;
export const GROUP_MAX_MAX = 8;

/**
 * Editable copy of a food (prices are strings while typing).
 * Until the «تخفیف ویژه» section lands (KAN-109), the form keeps its old fields on top of `discount`:
 * `price` = what the customer pays now, `oldPrice` = the base price while discounted (D-131 contract).
 */
export interface DishDraft {
  id?: string;
  name: string;
  price: string;
  oldPrice: string;
  /** Discount as loaded, so its label and end survive an edit. */
  discount?: FoodDiscount | null;
  description: string;
  categoryId: string;
  art: string;
  available: boolean;
  groups: OptionGroup[];
  photo?: Food['photo'];
  /** New dish: photo uploaded before the dish exists; submitted right after it is created. */
  pendingUploadId?: string;
}

export type DishErrors = Partial<Record<'name' | 'price' | 'oldPrice' | 'categoryId', string>>;

/** Digits only (Persian/Arabic digits and separators accepted) → integer, or null when empty/invalid. */
export function parseToman(input: string): number | null {
  const v = normalizeDigits(input).replace(/[,،٬\s]/g, '');
  if (!v) return null;
  return /^\d+$/.test(v) ? Number(v) : NaN;
}

/** Dish rules (screen specs §3): name ≥ 2, price > 0, old price optional but above the price, a category. */
export function dishErrors(d: DishDraft): DishErrors {
  const e: DishErrors = {};
  if (d.name.trim().length < 2) e.name = 'نام غذا حداقل ۲ حرف است';
  const price = parseToman(d.price);
  if (price === null || Number.isNaN(price) || price <= 0) e.price = 'قیمت را به تومان بنویسید';
  const old = parseToman(d.oldPrice);
  if (old !== null && (Number.isNaN(old) || (price && old > 0 && old <= price)))
    e.oldPrice = 'باید از قیمت فعلی بیشتر باشد';
  if (!d.categoryId) e.categoryId = 'یک دسته انتخاب کنید';
  return e;
}

export function draftFromFood(f: Food | undefined, cat?: string): DishDraft {
  if (!f)
    return {
      name: '',
      price: '',
      oldPrice: '',
      description: '',
      categoryId: cat ?? '',
      art: DISH_ARTS[0].art,
      available: true,
      groups: [],
    };
  const disc = liveDiscount(f);
  return {
    id: f.id,
    name: f.name ?? '',
    price: disc ? String(disc.price) : f.price ? String(f.price) : '',
    oldPrice: disc && f.price ? String(f.price) : '',
    discount: disc,
    description: f.description ?? '',
    categoryId: f.categoryId ?? '',
    art: f.art || DISH_ARTS[0].art,
    available: f.available !== false,
    groups: (f.groups ?? []).map((g) => ({ ...g, options: (g.options ?? []).map((o) => ({ ...o })) })),
    photo: f.photo,
  };
}

/** Request body; groups are sent only when extras are on for the restaurant (server ignores them otherwise). */
export function foodInput(d: DishDraft, withGroups: boolean): FoodInput {
  const price = parseToman(d.price) ?? 0;
  const old = parseToman(d.oldPrice);
  const discounted = !!old && !Number.isNaN(old) && old > price && price > 0;
  return {
    name: d.name.trim(),
    description: d.description.trim(),
    price: discounted ? old : price,
    discount: discounted
      ? { price, label: d.discount?.label ?? 'special', endsAt: d.discount?.endsAt ?? null }
      : null,
    categoryId: d.categoryId,
    art: d.art,
    available: d.available,
    ...(withGroups ? { groups: d.groups } : {}),
  };
}

/** «انتخاب ۱ مورد · اجباری» / «تا ۳ مورد · اختیاری» (screen specs §3). */
export function groupRule(g: Pick<OptionGroup, 'required' | 'max'>): string {
  const max = g.max ?? 1;
  const pick = max <= 1 ? 'انتخاب ۱ مورد' : `تا ${toFaDigits(max)} مورد`;
  return `${pick} · ${g.required ? 'اجباری' : 'اختیاری'}`;
}

export const optionPriceText = (price: number | undefined) => (price ? `+${formatMoney(price)}` : 'رایگان');

/** Group being edited: option prices are strings while typing. */
export interface GroupDraft {
  id?: string;
  title: string;
  required: boolean;
  max: number;
  options: { key: string; id?: string; name: string; price: string }[];
}
export type GroupErrors = Partial<Record<'title' | 'options', string>>;

let optSeq = 0;
export const blankOption = () => ({ key: `o${++optSeq}`, name: '', price: '' });

export function groupDraft(g: OptionGroup | undefined): GroupDraft {
  if (!g) return { title: '', required: false, max: 1, options: [blankOption()] };
  return {
    id: g.id,
    title: g.title ?? '',
    required: !!g.required,
    max: Math.min(GROUP_MAX_MAX, Math.max(GROUP_MAX_MIN, g.max ?? 1)),
    options: (g.options ?? []).map((o) => ({
      key: `o${++optSeq}`,
      id: o.id,
      name: o.name ?? '',
      price: o.price ? String(o.price) : '',
    })),
  };
}

/** Save needs a title (≥ 2) and at least one named option; prices are whole toman (empty = free). */
export function groupErrors(g: GroupDraft): GroupErrors {
  const e: GroupErrors = {};
  if (g.title.trim().length < 2) e.title = 'عنوان گروه حداقل ۲ حرف است';
  if (!g.options.some((o) => o.name.trim())) e.options = 'حداقل یک گزینه با نام لازم است';
  else if (g.options.some((o) => Number.isNaN(parseToman(o.price))))
    e.options = 'قیمت گزینه‌ها فقط عدد به تومان است';
  return e;
}

/** Unnamed rows are dropped; empty or zero price = free. */
export function groupFromDraft(g: GroupDraft): OptionGroup {
  return {
    ...(g.id ? { id: g.id } : {}),
    title: g.title.trim(),
    required: g.required,
    max: g.max,
    options: g.options
      .filter((o) => o.name.trim())
      .map((o) => ({ ...(o.id ? { id: o.id } : {}), name: o.name.trim(), price: parseToman(o.price) || 0 })),
  };
}

interface DishState {
  /** Route key of the dish screen that owns the draft. */
  owner: string | null;
  draft: DishDraft | null;
  start: (owner: string, draft: DishDraft) => void;
  patch: (p: Partial<DishDraft>) => void;
  /** index null = add a new group. */
  putGroup: (index: number | null, g: OptionGroup) => void;
  removeGroup: (index: number) => void;
  clear: () => void;
}

/** The dish being edited, shared by `dish` and its `group` sub-screen. */
export const useDish = create<DishState>((set, get) => ({
  owner: null,
  draft: null,
  start: (owner, draft) => set({ owner, draft }),
  patch: (p) => {
    const d = get().draft;
    if (d) set({ draft: { ...d, ...p } });
  },
  putGroup: (index, g) => {
    const d = get().draft;
    if (!d) return;
    const groups = index === null ? [...d.groups, g] : d.groups.map((x, i) => (i === index ? g : x));
    set({ draft: { ...d, groups } });
  },
  removeGroup: (index) => {
    const d = get().draft;
    if (d) set({ draft: { ...d, groups: d.groups.filter((_, i) => i !== index) } });
  },
  clear: () => set({ owner: null, draft: null }),
}));
