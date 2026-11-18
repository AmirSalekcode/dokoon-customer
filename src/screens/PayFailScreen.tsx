import { useState } from 'react';
import { api } from '@/api/client';
import { useApi } from '@/api/useApi';
import { useCart } from '@/cart/cart';
import { Button } from '@/components/base/Button';
import { Art } from '@/components/primitives/Art';
import { usePayMethod } from '@/features/checkout';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from './registry';
import s from './cart/payment.module.css';

/**
 * Payment failed (screen-specs §3 payfail). Replaces the gateway, so back returns to checkout.
 * The cart is kept. «تلاش دوباره» asks the server for a new payment attempt on the same order.
 */
export function PayFailScreen({ route }: ScreenProps) {
  const orderId = route.params.orderId ?? '';
  const restaurantId = useCart((st) => st.restaurant?.id ?? '');
  const [busy, setBusy] = useState(false);
  const r = useApi(
    async () => {
      if (!restaurantId) return null;
      const { data } = await api.GET('/restaurants/{id}', { params: { path: { id: restaurantId } } });
      return data ?? null;
    },
    [restaurantId],
    { fullPageErrors: false },
  );
  const allowCash = r.status === 'success' && !!r.data?.allowCash;

  const retry = async () => {
    setBusy(true);
    try {
      const { data, error } = await api.POST('/orders/{id}/payment/retry', {
        params: { path: { id: orderId } },
      });
      if (error !== undefined || !data) throw error;
      useNav.getState().setTop('gateway', { orderId, url: data.redirectUrl ?? '' });
    } catch {
      toast('شروع دوباره‌ی پرداخت ممکن نشد. از صفحه‌ی تکمیل سفارش دوباره ثبت کنید.', 'error');
      setBusy(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.fail}>
        <Art src="dk-all" className={s.art} />
        <h1>پرداخت ناموفق بود</h1>
        <p>
          سفارش شما هنوز ثبت نهایی نشده و سبد خرید حفظ شده است. اگر مبلغی از حساب شما کم شده باشد، حداکثر تا
          ۷۲ ساعت به حساب شما برمی‌گردد.
        </p>
      </div>
      <div className={s.acts}>
        <Button size="lg" block disabled={busy} onClick={() => void retry()}>
          تلاش دوباره
        </Button>
        {allowCash ? (
          <Button
            size="lg"
            block
            variant="secondary"
            disabled={busy}
            onClick={() => {
              usePayMethod.getState().set('cash');
              useNav.getState().back();
            }}
          >
            انتخاب پرداخت نقدی
          </Button>
        ) : null}
      </div>
    </div>
  );
}
