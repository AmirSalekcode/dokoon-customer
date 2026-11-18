import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { Order } from '@/api/types';
import { useNav } from '@/nav/nav';

/**
 * Contract fallback for live status: poll GET /orders/{id} every 15s (SSE `/orders/{id}/events`
 * comes later). Polling stops once the order is final.
 */
export const POLL_MS = 15_000;
const FINAL = new Set(['DELIVERED', 'CANCELED_BY_CUSTOMER', 'REJECTED', 'EXPIRED', 'PAYMENT_FAILED']);
export const isFinal = (o: Order | null) => !!o && FINAL.has(o.status ?? '');

export const STEP_LABELS = ['ثبت شد', 'تأیید رستوران', 'در حال آماده‌سازی', 'در راه', 'تحویل شد'];

export function statusText(o: Order): string {
  switch (o.status) {
    case 'CANCELED_BY_CUSTOMER':
      return 'سفارش لغو شد';
    case 'REJECTED':
      return 'رستوران سفارش را نپذیرفت';
    case 'EXPIRED':
    case 'PAYMENT_FAILED':
      return 'مهلت پرداخت سفارش تمام شد';
    case 'PENDING_PAYMENT':
      return 'در انتظار پرداخت';
    default: {
      const step = o.step ?? 0;
      return step === 0 ? 'سفارش ثبت شد' : (STEP_LABELS[step] ?? '');
    }
  }
}

interface State {
  order: Order | null;
  error: unknown;
}

/** Live order for the track screen; refreshes on a timer and whenever its screen is on top again. */
export function useOrder(orderId: string, routeKey: string) {
  const [st, setSt] = useState<State>({ order: null, error: null });
  const [tick, setTick] = useState(0);
  const onTop = useNav((n) => n.stack.at(-1)?.key === routeKey);
  const final = isFinal(st.order);
  const hasOrder = useRef(false);
  useEffect(() => {
    hasOrder.current = !!st.order;
  }, [st.order]);

  useEffect(() => {
    let alive = true;
    api
      .GET('/orders/{id}', { params: { path: { id: orderId } } })
      .then(({ data, error }) => {
        if (!alive) return;
        if (data) setSt({ order: data, error: null });
        else setSt((cur) => ({ order: cur.order, error }));
      })
      .catch((error: unknown) => {
        if (!alive) return;
        // Full-page errors (404, 5xx…) only when there is nothing to show yet.
        if (!hasOrder.current && error instanceof ApiError && error.kind)
          useNav.getState().showError(error.kind);
        setSt((cur) => ({ order: cur.order, error }));
      });
    return () => {
      alive = false;
    };
  }, [orderId, tick, onTop]);

  useEffect(() => {
    if (final || !onTop) return;
    const id = setInterval(() => setTick((t) => t + 1), POLL_MS);
    return () => clearInterval(id);
  }, [final, onTop]);

  return { ...st, reload: () => setTick((t) => t + 1) };
}
