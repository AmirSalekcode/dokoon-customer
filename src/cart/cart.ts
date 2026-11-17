import { create } from 'zustand';
import { readJson, writeJson } from '@/lib/storage';

const KEY = 'dk-cart';

export interface CartOption {
  id: string;
  title: string;
  priceDelta: number;
}

export interface CartLine {
  /** foodId + sorted option ids; same food with same options merges into one line. */
  lineId: string;
  foodId: string;
  title: string;
  imageUrl?: string;
  /** Base price + option deltas, integer toman (client-side estimate; server quote wins). */
  unitPrice: number;
  qty: number;
  options: CartOption[];
}

export interface CartRestaurant {
  id: string;
  name: string;
}

export interface PendingAdd {
  restaurant: CartRestaurant;
  line: Omit<CartLine, 'lineId' | 'qty'> & { qty?: number };
}

interface CartData {
  restaurant: CartRestaurant | null;
  lines: CartLine[];
  /** Cart note — the only note (no per-food notes). */
  note: string;
  promoCode: string;
}

export interface CartState extends CartData {
  /** Set when an add came from a different restaurant and needs «پاک‌کردن سبد قبلی؟» confirmation. */
  pending: PendingAdd | null;
  add: (restaurant: CartRestaurant, line: PendingAdd['line']) => 'added' | 'needs-confirm';
  confirmReplace: () => void;
  cancelPending: () => void;
  inc: (lineId: string) => void;
  /** Decrement; reaching zero removes the line (and empties the cart's restaurant when last). */
  dec: (lineId: string) => void;
  remove: (lineId: string) => void;
  setNote: (note: string) => void;
  setPromo: (code: string) => void;
  clear: () => void;
}

export const lineIdOf = (foodId: string, optionIds: string[]) => [foodId, ...[...optionIds].sort()].join('|');

const empty: CartData = { restaurant: null, lines: [], note: '', promoCode: '' };

function persist(s: CartData) {
  writeJson(KEY, { restaurant: s.restaurant, lines: s.lines, note: s.note, promoCode: s.promoCode });
}

function withLine(lines: CartLine[], line: PendingAdd['line']): CartLine[] {
  const lineId = lineIdOf(
    line.foodId,
    line.options.map((o) => o.id),
  );
  const qty = line.qty ?? 1;
  const existing = lines.find((l) => l.lineId === lineId);
  if (existing) return lines.map((l) => (l.lineId === lineId ? { ...l, qty: l.qty + qty } : l));
  return [...lines, { ...line, lineId, qty }];
}

/** The single shared cart (one restaurant at a time). */
export const useCart = create<CartState>((set, get) => {
  const commit = (patch: Partial<CartData>) => {
    const next = { ...get(), ...patch };
    if (next.lines.length === 0) Object.assign(next, { restaurant: null, promoCode: '' });
    persist(next);
    set({ restaurant: next.restaurant, lines: next.lines, note: next.note, promoCode: next.promoCode });
  };
  return {
    ...readJson<CartData>(KEY, empty),
    pending: null,
    add: (restaurant, line) => {
      const cur = get().restaurant;
      if (cur && cur.id !== restaurant.id && get().lines.length > 0) {
        set({ pending: { restaurant, line } });
        return 'needs-confirm';
      }
      commit({ restaurant, lines: withLine(get().lines, line) });
      return 'added';
    },
    confirmReplace: () => {
      const p = get().pending;
      if (!p) return;
      set({ pending: null });
      commit({ restaurant: p.restaurant, lines: withLine([], p.line), note: '', promoCode: '' });
    },
    cancelPending: () => set({ pending: null }),
    inc: (lineId) =>
      commit({ lines: get().lines.map((l) => (l.lineId === lineId ? { ...l, qty: l.qty + 1 } : l)) }),
    dec: (lineId) =>
      commit({
        lines: get()
          .lines.map((l) => (l.lineId === lineId ? { ...l, qty: l.qty - 1 } : l))
          .filter((l) => l.qty > 0),
      }),
    remove: (lineId) => commit({ lines: get().lines.filter((l) => l.lineId !== lineId) }),
    setNote: (note) => commit({ note }),
    setPromo: (promoCode) => commit({ promoCode }),
    clear: () => {
      persist(empty);
      set({ ...empty, pending: null });
    },
  };
});

export const cartCount = (s: Pick<CartState, 'lines'>) => s.lines.reduce((n, l) => n + l.qty, 0);
export const cartItemsTotal = (s: Pick<CartState, 'lines'>) =>
  s.lines.reduce((n, l) => n + l.qty * l.unitPrice, 0);
export const qtyOfFood = (s: Pick<CartState, 'lines'>, foodId: string) =>
  s.lines.filter((l) => l.foodId === foodId).reduce((n, l) => n + l.qty, 0);
