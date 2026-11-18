import { api } from '@/api/client';
import type { Order } from '@/api/types';
import { useCart } from '@/cart/cart';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';

/** Order waiting for «سبد خرید قبلی خالی شود؟» confirmation. */
let pending: Order | null = null;

/**
 * «سفارش مجدد» (spec §4 orders): GET /orders/{id}/reorder returns the old lines with CURRENT price
 * and availability. Available lines go into the shared cart, then the cart opens. If the cart holds
 * another restaurant, ask first (CLAUDE.md rule 5).
 * Contract gap: reorder lines carry no option ids, so options are not restored (contract-notes #2).
 */
export async function reorder(order: Order, opts: { replace?: boolean } = {}): Promise<void> {
  const cart = useCart.getState();
  const rid = order.restaurant?.id ?? '';
  if (!opts.replace && cart.lines.length > 0 && cart.restaurant?.id !== rid) {
    pending = order;
    useNav.getState().openOverlay({ kind: 'dlg', props: { action: 'reorder' } });
    return;
  }
  try {
    const { data } = await api.GET('/orders/{id}/reorder', { params: { path: { id: order.id ?? '' } } });
    if (!data) throw new Error('no quote');
    const lines = (data.lines ?? []).filter((l) => l.available !== false);
    if (lines.length === 0) {
      toast('غذاهای این سفارش دیگر موجود نیستند.', 'error');
      return;
    }
    if (opts.replace || cart.restaurant?.id !== rid) cart.clear();
    const restaurant = { id: rid, name: order.restaurant?.name ?? '' };
    for (const l of lines)
      useCart.getState().add(restaurant, {
        foodId: l.foodId ?? '',
        title: l.title ?? '',
        unitPrice: l.unitPrice ?? 0,
        qty: l.qty ?? 1,
        options: [],
      });
    if (lines.length < (data.lines ?? []).length) toast('برخی غذاها دیگر موجود نیستند و اضافه نشدند.');
    useNav.getState().resetTo('cart');
  } catch {
    toast('سفارش مجدد انجام نشد. دوباره تلاش کنید.', 'error');
  }
}

/** Confirmed in the dialog: replace the cart with the pending order. */
export function confirmPendingReorder() {
  const o = pending;
  pending = null;
  if (o) void reorder(o, { replace: true });
}

export function cancelPendingReorder() {
  pending = null;
}
