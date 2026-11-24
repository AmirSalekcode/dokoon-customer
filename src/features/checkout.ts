import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { api } from '@/api/client';
import type { OrderDraft, Quote } from '@/api/types';
import { useCart, type CartLine, type CartState } from '@/cart/cart';
import { formatMoney } from '@/lib/format';
import { toast } from '@/ui/toast';

export type PayMethod = 'online' | 'cash';

/** Shown when the server price differs from the cart (quote) or POST /orders answers 409. */
export const PRICE_CHANGED_TEXT = 'قیمت یا موجودی تغییر کرد؛ سفارش را دوباره بررسی کنید.';

/**
 * Lines whose server unit price differs from the cart (e.g. a food discount ended, D-131/D-66). The quote
 * lists lines in cart order; a quote that does not line up with the cart (stale) is ignored.
 */
export function repricedLines(
  lines: Pick<CartLine, 'lineId' | 'foodId' | 'unitPrice'>[],
  quote: Quote | null | undefined,
): { lineId: string; unitPrice: number }[] {
  const q = quote?.lines ?? [];
  if (q.length !== lines.length || lines.some((l, i) => q[i].foodId !== l.foodId)) return [];
  return lines.flatMap((l, i) => {
    const unit = q[i].unitPrice;
    return typeof unit === 'number' && unit !== l.unitPrice ? [{ lineId: l.lineId, unitPrice: unit }] : [];
  });
}

/** Cart → contract OrderDraft. Server prices win; clientUnitPrice is only for mismatch detection. */
export function toDraft(
  cart: Pick<CartState, 'restaurant' | 'lines' | 'note' | 'promoCode'>,
  extra: { addressId?: string; payMethod?: PayMethod; recipient?: OrderDraft['recipient'] } = {},
): OrderDraft {
  return {
    restaurantId: cart.restaurant?.id ?? '',
    lines: cart.lines.map((l) => ({
      foodId: l.foodId,
      qty: l.qty,
      optionIds: l.options.map((o) => o.id),
      clientUnitPrice: l.unitPrice,
    })),
    addressId: extra.addressId ?? '',
    payMethod: extra.payMethod ?? 'online',
    ...(extra.recipient ? { recipient: extra.recipient } : {}),
    ...(cart.promoCode ? { promoCode: cart.promoCode } : {}),
    ...(cart.note.trim() ? { note: cart.note.trim() } : {}),
  };
}

interface Settled {
  key: string;
  quote: Quote | null;
  error: unknown;
}

/**
 * Server-side price check (POST /checkout/quote) of the shared cart. Re-quotes whenever the cart,
 * promo or address changes; keeps showing the last quote while the next one loads (no flicker).
 */
export function useQuote(addressId = '') {
  const cart = useCart();
  const draft = toDraft(cart, { addressId });
  const key = cart.lines.length ? JSON.stringify(draft) : '';
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const fullKey = `${key}#${tick}`;

  useEffect(() => {
    if (!key) return;
    let alive = true;
    api
      .POST('/checkout/quote', { body: JSON.parse(key) as OrderDraft })
      .then(({ data, error }) => {
        if (!alive) return;
        setSettled(
          error !== undefined
            ? { key: fullKey, quote: null, error }
            : { key: fullKey, quote: data ?? null, error: null },
        );
      })
      .catch((error: unknown) => alive && setSettled({ key: fullKey, quote: null, error }));
    return () => {
      alive = false;
    };
  }, [key, fullKey]);

  // A food discount that ended (or any server price change) while the food sat in the cart: take the
  // server price and say so with the same message as a 409 on POST /orders (D-66, D-131).
  useEffect(() => {
    const changes = repricedLines(useCart.getState().lines, settled?.quote);
    if (!changes.length) return;
    useCart.getState().reprice(changes);
    toast(PRICE_CHANGED_TEXT, 'error');
  }, [settled]);

  const loading = !!key && settled?.key !== fullKey;
  const lastGood = settled?.quote ?? null;
  return {
    quote: lastGood,
    error: !loading && settled?.error ? settled.error : null,
    loading,
    retry: () => setTick((t) => t + 1),
  };
}

/** Quote → PriceSummary rows (shared by cart and checkout). */
export function summaryRows(q: Pick<Quote, 'itemsTotal' | 'deliveryFee' | 'discount'>) {
  const rows: { label: string; value: string; tone?: 'good' }[] = [
    { label: 'جمع غذاها', value: formatMoney(q.itemsTotal ?? 0) },
    q.deliveryFee
      ? { label: 'هزینه‌ی ارسال', value: formatMoney(q.deliveryFee) }
      : { label: 'هزینه‌ی ارسال', value: 'رایگان', tone: 'good' },
  ];
  if (q.discount) rows.push({ label: 'تخفیف', value: `−${formatMoney(q.discount)}`, tone: 'good' });
  return rows;
}

/** Lines the server says are unavailable (by foodId). */
export const unavailableFoods = (q: Quote | null) =>
  new Set((q?.lines ?? []).filter((l) => l.available === false).map((l) => l.foodId!));

/** Chosen payment method; kept across checkout ↔ gateway ↔ payfail («انتخاب پرداخت نقدی»). */
export const usePayMethod = create<{ method: PayMethod; set: (m: PayMethod) => void }>((set) => ({
  method: 'online',
  set: (method) => set({ method }),
}));
