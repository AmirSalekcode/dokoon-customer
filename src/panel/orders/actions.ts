import { toast } from '@/ui/toast';
import { panelApi, type PanelApi } from '../api/client';
import { businessError } from '../api/errors';
import type { Order } from '../api/types';
import { showFullPageError } from '../errors/fullPage';
import { useHistory } from '../state/history';
import { isActive, useOrders } from '../state/orders';

/** Restaurant toasts stay 2.6 s (component library). */
export const TOAST_MS = 2600;

export type OrderActionKind = 'accept' | 'reject' | 'extend' | 'ready' | 'handover';
export interface OrderActionArgs {
  prepMinutes?: number;
  reasonId?: string;
  addMinutes?: number;
}
/** ok: done; conflict: 409/400 (shown as a toast, order re-read); error: full page or toast. */
export type OrderActionResult = 'ok' | 'conflict' | 'error';

function post(api: PanelApi, id: string, kind: OrderActionKind, a: OrderActionArgs) {
  const params = { path: { id } };
  switch (kind) {
    case 'accept':
      return api.POST('/r/orders/{id}/accept', { params, body: { prepMinutes: a.prepMinutes ?? 0 } });
    case 'reject':
      return api.POST('/r/orders/{id}/reject', { params, body: { reasonId: a.reasonId ?? '' } });
    case 'extend':
      return api.POST('/r/orders/{id}/extend', { params, body: { addMinutes: a.addMinutes ?? 5 } });
    case 'ready':
      return api.POST('/r/orders/{id}/ready', { params });
    case 'handover':
      return api.POST('/r/orders/{id}/handover', { params });
  }
}

function doneText(kind: OrderActionKind, before: Order | undefined, a: OrderActionArgs): string {
  switch (kind) {
    case 'accept':
      return 'سفارش پذیرفته شد';
    case 'reject':
      return before?.status === 'prep' ? 'سفارش لغو شد' : 'سفارش رد شد';
    case 'extend':
      return `${(a.addMinutes ?? 5).toLocaleString('fa-IR')} دقیقه به زمان آماده‌سازی اضافه شد`;
    case 'ready':
      return 'سفارش آماده شد؛ پیک مطلع می‌شود';
    case 'handover':
      return 'تحویل به پیک ثبت شد';
  }
}

/** Re-read one order after a conflict (another device or the server changed it). */
async function refresh(api: PanelApi, id: string) {
  try {
    const { data } = await api.GET('/r/orders/{id}', { params: { path: { id } } });
    if (data) settle(data);
  } catch {
    /* the next sync fixes it */
  }
}

function settle(o: Order) {
  useOrders.getState().upsert(o);
  if (!isActive(o)) useHistory.getState().invalidate();
}

/**
 * One order state change from this device (card button, detail, alert, sheets). The Idempotency-Key
 * middleware makes retries safe; a second tap while busy is ignored.
 */
export async function runOrderAction(
  id: string,
  kind: OrderActionKind,
  args: OrderActionArgs = {},
  api: PanelApi = panelApi(),
): Promise<OrderActionResult> {
  const store = useOrders.getState();
  if (store.busy[id]) return 'error';
  const before = store.byId[id];
  store.setBusy(id, true);
  try {
    const { data, error } = await post(api, id, kind, args);
    if (error !== undefined || !data) {
      const b = businessError(error);
      toast(b?.message ?? 'مشکلی پیش آمد؛ دوباره تلاش کنید', 'warn', TOAST_MS);
      void refresh(api, id);
      return 'conflict';
    }
    settle(data);
    toast(doneText(kind, before, args), 'info', TOAST_MS);
    return 'ok';
  } catch (e) {
    if (!showFullPageError(e, () => void runOrderAction(id, kind, args, api)))
      toast('مشکلی پیش آمد؛ دوباره تلاش کنید', 'warn', TOAST_MS);
    return 'error';
  } finally {
    useOrders.getState().setBusy(id, false);
  }
}
