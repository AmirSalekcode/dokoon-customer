import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { useCart } from '@/cart/cart';
import { Button } from '@/components/base/Button';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { fetchOrder, simulateGatewayReturn } from '@/features/payment';
import { formatMoney, toFaDigits } from '@/lib/format';
import { setBackInterceptor, useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from './registry';
import s from './cart/payment.module.css';

/**
 * Payment gateway (screen-specs §3 gateway). Until Zibal/ZarinPal is chosen (D-49) this is the
 * simulator: success → paid, failure/cancel → payfail, timeout → error e504. System back = cancel.
 * The result always comes from the server (re-read the order), never from the gateway's answer.
 */
export function GatewayScreen({ route }: ScreenProps) {
  const orderId = route.params.orderId ?? '';
  const [busy, setBusy] = useState(false);
  const data = useApi(
    () => unwrap(api.GET('/orders/{id}', { params: { path: { id: orderId } } })),
    [orderId],
  );

  const finish = async (result: 'ok' | 'fail') => {
    setBusy(true);
    const nav = useNav.getState();
    try {
      await simulateGatewayReturn(orderId, result);
      const order = await fetchOrder(orderId);
      if (order?.paymentStatus === 'paid') {
        useCart.getState().clear();
        nav.resetTo('home');
        nav.push('paid', {
          orderId,
          number: order.number ?? '',
          method: 'online',
          total: String(order.totals?.total ?? 0),
        });
      } else nav.setTop('payfail', { orderId });
    } catch {
      toast('اتصال برقرار نشد. دوباره تلاش کنید.', 'error');
      setBusy(false);
    }
  };

  useEffect(() => {
    setBackInterceptor(route.key, () => {
      void finish('fail');
      return true;
    });
    return () => setBackInterceptor(route.key, null);
    // finish only depends on orderId, which is part of route.key's route
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.key]);

  if (data.status === 'loading') return <LoadingState variant="list" />;
  if (data.status === 'error') return <ErrorState onRetry={data.reload} />;
  const o = data.data;

  return (
    <div className={s.page}>
      <TopBar title="پرداخت آنلاین" onBack={() => void finish('fail')} />
      <div className={s.card}>
        <p className={s.badge}>درگاه آزمایشی — هنوز درگاه بانکی واقعی وصل نشده است</p>
        <p className={s.label}>مبلغ قابل پرداخت</p>
        <p className={s.amount}>{formatMoney(o.totals?.total ?? 0)}</p>
        <p className={s.meta}>
          سفارش {toFaDigits(o.number ?? '')} · {o.restaurant?.name}
        </p>
      </div>
      <div className={s.acts}>
        <Button size="lg" block disabled={busy} onClick={() => void finish('ok')}>
          پرداخت موفق
        </Button>
        <Button size="lg" block variant="secondary" disabled={busy} onClick={() => void finish('fail')}>
          پرداخت ناموفق
        </Button>
        <Button
          size="lg"
          block
          variant="ghost"
          disabled={busy}
          onClick={() => useNav.getState().showError('e504')}
        >
          پایان مهلت پرداخت
        </Button>
        <Button size="lg" block variant="ghost" disabled={busy} onClick={() => void finish('fail')}>
          انصراف
        </Button>
      </div>
    </div>
  );
}
