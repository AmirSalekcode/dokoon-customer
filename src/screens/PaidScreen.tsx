import { Button } from '@/components/base/Button';
import { Art } from '@/components/primitives/Art';
import { formatMoney, toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from './registry';
import s from './cart/paid.module.css';

/**
 * Order placed (screen-specs §3 paid). Checkout opens it as [home, paid] after emptying the cart,
 * so back (button or system) returns home, never to checkout.
 */
export function PaidScreen({ route }: ScreenProps) {
  const { push, resetTo } = useNav.getState();
  const { orderId = '', number = '', method, total = '0' } = route.params;
  return (
    <div className={s.page}>
      <Art src="dk-mix" className={s.art} />
      <h1 className={s.h}>سفارش شما ثبت شد</h1>
      {number ? <p className={s.num}>شماره‌ی سفارش: {toFaDigits(number)}</p> : null}
      {method === 'cash' ? (
        <p className={s.box}>مبلغ قابل پرداخت هنگام تحویل: {formatMoney(Number(total))}</p>
      ) : (
        <p className={`${s.box} ${s.ok}`}>پرداخت موفق</p>
      )}
      <p className={s.sub}>رستوران سفارش را بررسی می‌کند؛ وضعیت را می‌توانید لحظه‌به‌لحظه دنبال کنید.</p>
      <div className={s.acts}>
        <Button size="lg" block onClick={() => push('track', { orderId })}>
          پیگیری سفارش
        </Button>
        <Button size="lg" block variant="secondary" onClick={() => resetTo('home')}>
          بازگشت به خانه
        </Button>
      </div>
    </div>
  );
}
