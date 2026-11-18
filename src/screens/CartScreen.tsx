import { cartItemsTotal, useCart } from '@/cart/cart';
import { openGuarded } from '@/auth/flow';
import { Button } from '@/components/base/Button';
import { CartItemRow } from '@/components/library/CartItemRow';
import { EmptyState } from '@/components/library/EmptyState';
import { PriceSummary } from '@/components/library/PriceSummary';
import { TopBar } from '@/components/library/TopBar';
import { formatMoney, toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import s from './screens.module.css';

/** Foundation demo of the cart tab: lines from the shared cart, note, client-side totals. */
export function CartScreen() {
  const cart = useCart();
  const resetTo = useNav((st) => st.resetTo);
  const total = cartItemsTotal(cart);

  if (cart.lines.length === 0) {
    return (
      <div className={s.page}>
        <TopBar title="سبد خرید" />
        <EmptyState
          art="dk-burger"
          title="سبد خرید شما خالی است"
          text="از رستوران‌های شهر غذای دلخواهتان را اضافه کنید."
          action={<Button onClick={() => resetTo('restaurants')}>رفتن به رستوران‌ها</Button>}
        />
      </div>
    );
  }

  return (
    <div className={s.page}>
      <TopBar title="سبد خرید" />
      <div className={`${s.pad} ${s.stack}`}>
        <p className={s.warn}>از «{cart.restaurant?.name}»</p>
        {cart.lines.map((l) => (
          <CartItemRow
            key={l.lineId}
            item={{
              name: l.title,
              art: l.imageUrl,
              optionsText: l.options.map((o) => o.title).join('، '),
              total: l.unitPrice * l.qty,
            }}
            qtyText={toFaDigits(l.qty)}
            onInc={() => cart.inc(l.lineId)}
            onDec={() => cart.dec(l.lineId)}
          />
        ))}
        <label htmlFor="cart-note" className="visually-hidden">
          یادداشت سفارش
        </label>
        <textarea
          id="cart-note"
          className={s.cartNote}
          maxLength={300}
          placeholder="یادداشت برای رستوران (اختیاری)"
          value={cart.note}
          onChange={(e) => cart.setNote(e.target.value)}
        />
        <PriceSummary
          rows={[{ label: 'جمع غذاها', value: formatMoney(total) }]}
          totalLabel="جمع (تخمینی)"
          totalValue={formatMoney(total)}
        />
        <Button size="lg" block onClick={() => openGuarded('checkout')}>
          ثبت سفارش · {formatMoney(total)}
        </Button>
        <p className={s.note}>
          مبلغ نهایی، هزینه‌ی ارسال و تخفیف را سرور در مرحله‌ی تکمیل سفارش محاسبه می‌کند.
        </p>
      </div>
    </div>
  );
}
