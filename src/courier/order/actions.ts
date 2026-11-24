import { ApiError } from '@/api/errors';
import { toast } from '@/ui/toast';
import { courierApi } from '../api/client';
import { businessError, COURIER_ERROR } from '../api/errors';
import type { ActiveOrder } from '../api/types';
import { showFullPageError } from '../errors/fullPage';
import { useCourierNav } from '../nav/nav';
import { useActiveOrder } from '../state/active';
import { COURIER_TOAST_MS } from '../state/online';

/**
 * Delivery-step actions (KAN-96/97, courier screen specs «سفارش (مراحل)»). Each is one request with an
 * Idempotency-Key (client.ts), so a retry after a lost answer is safe. The server is the judge of every
 * step: a `409` re-reads the active order instead of guessing.
 */
export type NextStage = 'pickup' | 'toCust' | 'handover';

export const ORDER_MSG = {
  failed: 'ثبت نشد؛ دوباره تلاش کنید',
  stale: 'وضعیت سفارش تغییر کرده بود؛ به‌روز شد',
  unchecked: 'همه‌ی غذاها را تیک بزنید',
  withdrawn: 'از سفارش انصراف دادید؛ سفارش به پیک دیگری داده می‌شود',
  withdrawClosed: 'سفارش را تحویل گرفته‌اید؛ انصراف دیگر ممکن نیست',
  issue: 'مشکل ثبت شد؛ پشتیبانی پیگیری می‌کند',
} as const;

/** Reasons until the server offers a list (contract-notes 36). */
export const WITHDRAW_REASONS = ['موتورم خراب شد', 'مسیر بسته است', 'مشکل شخصی پیش آمد', 'رستوران خیلی دیر آماده می‌کند'];
export const ISSUE_REASONS = ['غذا کم است', 'غذای اشتباه است', 'بسته‌بندی آسیب دیده', 'سفارش هنوز آماده نیست'];

const fail = (msg: string = ORDER_MSG.failed) => toast(msg, 'error', COURIER_TOAST_MS);

/** Full-page kinds (offline, 401, 5xx) get their page; anything else a toast. */
function onThrown(e: unknown, retry: () => void) {
  if (!(e instanceof ApiError && showFullPageError(e, retry))) fail();
}

const current = () => useActiveOrder.getState().order;

/** Next step. Leaving pickup sends the ticked dishes. Resolves true when the step moved. */
export async function advance(next: NextStage): Promise<boolean> {
  const order = current();
  if (!order?.id) return false;
  const checkedItems = next === 'toCust' ? useActiveOrder.getState().checked : undefined;
  try {
    const { data, error } = await courierApi().POST('/c/orders/{id}/stage', {
      params: { path: { id: order.id } },
      body: { stage: next, ...(checkedItems ? { checkedItems } : {}) },
    });
    if (error === undefined) {
      // The contract leaves the 200 body untyped; the mock returns the order. Either way the step moved.
      const updated = data as ActiveOrder | undefined;
      useActiveOrder.getState().set(updated?.id ? updated : { ...order, stage: next });
      return true;
    }
    const code = businessError(error)?.code;
    if (code === 'ITEMS_UNCHECKED') fail(ORDER_MSG.unchecked);
    else if (code === 'INVALID_STAGE') {
      toast(ORDER_MSG.stale, 'warn', COURIER_TOAST_MS);
      await useActiveOrder.getState().load();
    } else fail();
  } catch (e) {
    onThrown(e, () => void advance(next));
  }
  return false;
}

/** Problem at the restaurant (wrong / missing food…): reported, the order goes on. */
export async function reportIssue(reason: string): Promise<boolean> {
  const order = current();
  if (!order?.id) return false;
  try {
    const { error } = await courierApi().POST('/c/orders/{id}/issue', {
      params: { path: { id: order.id } },
      body: { reason },
    });
    if (error === undefined) {
      toast(ORDER_MSG.issue, 'info', COURIER_TOAST_MS);
      return true;
    }
    fail();
  } catch (e) {
    onThrown(e, () => void reportIssue(reason));
  }
  return false;
}

/**
 * Give the order back, only before pickup (screen specs «انصراف»). The order goes to another courier; this
 * one returns to the orders tab, still online.
 */
export async function withdraw(reason: string): Promise<boolean> {
  const order = current();
  if (!order?.id) return false;
  try {
    const { error } = await courierApi().POST('/c/orders/{id}/withdraw', {
      params: { path: { id: order.id } },
      body: { reason },
    });
    if (error === undefined) {
      useActiveOrder.getState().set(null);
      useCourierNav.getState().resetTo('orders');
      toast(ORDER_MSG.withdrawn, 'warn', COURIER_TOAST_MS);
      return true;
    }
    if (businessError(error)?.code === COURIER_ERROR.withdrawClosed) {
      toast(ORDER_MSG.withdrawClosed, 'warn', COURIER_TOAST_MS);
      await useActiveOrder.getState().load();
    } else fail();
  } catch (e) {
    onThrown(e, () => void withdraw(reason));
  }
  return false;
}
