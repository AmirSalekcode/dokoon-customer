import { useEffect, useState } from 'react';
import { ApiError } from '@/api/errors';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { formatMoney, toFaDigits } from '@/lib/format';
import { panelApi } from '../api/client';
import type { Order } from '../api/types';
import { OrderDetail, type OrderDetailView } from '../components/OrderDetail';
import { usePanelNav } from '../nav/nav';
import { useHistory } from '../state/history';
import { useOrders } from '../state/orders';
import { runOrderAction } from './actions';
import { useNow } from './hooks';
import {
  agoText,
  canReject,
  clockText,
  orderNo,
  payText,
  primaryAction,
  secondsLeft,
  statusLabel,
  statusTone,
  totalText,
} from './present';
import { printReceipt, usePrint } from './print';

/** «+۵ دقیقه» on a preparing order (contract: `extend` 1..30). */
export const EXTEND_MINUTES = 5;

/** The order from the live store, the finished ones of this session or the loaded history. */
function useKnownOrder(id: string): Order | undefined {
  const live = useOrders((st) => st.byId[id]);
  const done = useOrders((st) => st.finished[id]);
  const hist = useHistory((st) => st.items.find((o) => o.id === id));
  return live ?? done ?? hist;
}

/** Known order, else `GET /r/orders/{id}` (opened from history after a reload, or a stale link). */
export function useOrder(id: string) {
  const known = useKnownOrder(id);
  const [fetched, setFetched] = useState<{ id: string; order?: Order; failed?: 'missing' | 'error' } | null>(
    null,
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (known) return;
    let alive = true;
    panelApi()
      .GET('/r/orders/{id}', { params: { path: { id } } })
      .then(
        ({ data }) => alive && setFetched(data ? { id, order: data } : { id, failed: 'error' }),
        (e: unknown) =>
          alive &&
          setFetched({ id, failed: e instanceof ApiError && e.kind === 'e404' ? 'missing' : 'error' }),
      );
    return () => {
      alive = false;
    };
  }, [id, known, attempt]);
  const mine = fetched?.id === id ? fetched : null;
  return {
    order: known ?? mine?.order,
    failed: known ? undefined : mine?.failed,
    retry: () => {
      setFetched(null);
      setAttempt((n) => n + 1);
    },
  };
}

/** Contract order → OrderDetail view. */
export function detailView(o: Order, now: number): OrderDetailView {
  const act = primaryAction(o);
  const left = secondsLeft(o, now);
  const etaText =
    o.status === 'prep' && o.prepMinutes
      ? `زمان آماده‌سازی: ${toFaDigits(o.prepMinutes)} دقیقه`
      : o.status === 'new' && left > 0
        ? `مهلت پاسخ: ${clockText(left)}`
        : (o.status === 'rejected' || o.status === 'cancelled') && o.rejectReason
          ? `دلیل: ${o.rejectReason}`
          : o.status === 'expired'
            ? 'در مهلت پاسخ داده نشد'
            : '';
  return {
    no: orderNo(o),
    statusLabel: statusLabel(o),
    tone: statusTone(o),
    placed: agoText(o.placedAt, now),
    etaText,
    canAddTime: o.status === 'prep',
    items: (o.items ?? []).map((i) => ({
      q: toFaDigits(i.qty ?? 1),
      name: i.name ?? '',
      opt: i.optionsText || undefined,
      price: formatMoney(i.price ?? 0),
    })),
    note: o.note || undefined,
    rows: [{ label: 'جمع غذاها', value: totalText(o) }],
    total: totalText(o),
    pay: o.payment === 'cash' ? 'cash' : 'online',
    payText: payText(o),
    customer: o.customerName ?? '',
    area: o.areaText || undefined,
    phoneMasked: o.customerPhoneMasked ? toFaDigits(o.customerPhoneMasked) : undefined,
    courier: o.courier?.name
      ? { name: o.courier.name, sub: o.courier.statusText ? toFaDigits(o.courier.statusText) : undefined }
      : null,
    primary: act ? { label: act.label, tone: act.tone } : null,
    secondaryLabel: canReject(o) ? (o.status === 'prep' ? 'لغو سفارش' : 'رد سفارش') : '',
  };
}

/** Order detail with its actions: the phone `order` screen and the tablet side panel (KAN-65). */
export function OrderDetailPanel({ id }: { id: string }) {
  const { order, failed, retry } = useOrder(id);
  const busy = useOrders((st) => !!st.busy[id]);
  const paper = usePrint((st) => st.paper);
  const setPaper = usePrint((st) => st.setPaper);
  const now = useNow(order?.status === 'new' ? 1000 : 30_000);

  if (!order) {
    if (failed === 'missing')
      return <EmptyState art="dk-all" title="سفارش پیدا نشد" text="این سفارش دیگر در دسترس نیست." />;
    if (failed === 'error') return <ErrorState onRetry={retry} />;
    return <LoadingState variant="list" rows={3} />;
  }
  const act = primaryAction(order);
  const { openOverlay } = usePanelNav.getState();
  return (
    <OrderDetail
      order={detailView(order, now)}
      busy={busy}
      onPrimary={() => {
        if (!act) return;
        if (act.kind === 'accept') openOverlay({ kind: 'prep', props: { id } });
        else void runOrderAction(id, act.kind);
      }}
      onSecondary={() => openOverlay({ kind: 'reason', props: { id } })}
      onAddTime={() => void runOrderAction(id, 'extend', { addMinutes: EXTEND_MINUTES })}
      onPrint={() => printReceipt(order)}
      paper={{ value: paper, onPick: setPaper }}
    />
  );
}
