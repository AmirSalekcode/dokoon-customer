import { useState } from 'react';
import { openGuarded } from '@/auth/flow';
import { cartItemsTotal, useCart } from '@/cart/cart';
import { Button } from '@/components/base/Button';
import { CartItemRow } from '@/components/library/CartItemRow';
import { EmptyState } from '@/components/library/EmptyState';
import { PriceSummary } from '@/components/library/PriceSummary';
import { PromoCodeInput } from '@/components/library/PromoCodeInput';
import { TopBar } from '@/components/library/TopBar';
import { useAddresses } from '@/features/addresses';
import { summaryRows, unavailableFoods, useQuote } from '@/features/checkout';
import { formatMoney, toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from './registry';
import s from './cart/cart.module.css';

/** Cart tab (screen-specs §3 cart): lines, the single cart note, promo code, server-quoted totals. */
export function CartScreen(_: ScreenProps) {
  const cart = useCart();
  const { resetTo, push } = useNav.getState();
  const addressId = useAddresses((st) => st.selectedId) ?? '';
  const { quote, error, loading, retry } = useQuote(addressId);
  const [code, setCode] = useState(cart.promoCode);

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

  const off = unavailableFoods(quote);
  // No minimum order (owner decision D-89): only unavailable foods block checkout.
  const blocked = off.size > 0 ? 'غذاهای ناموجود را از سبد حذف کنید' : '';
  const canGo = !!quote && !loading && !error && !blocked;
  const total = quote?.total ?? cartItemsTotal(cart);
  const promo = quote?.promo;
  const promoShown = !!cart.promoCode && !!promo && promo.status !== 'none';

  return (
    <div className={s.page}>
      <TopBar title="سبد خرید" />
      <div className={s.body}>
        <div className={s.rest}>
          <div>
            <small>سفارش از</small>
            <h2>{cart.restaurant?.name}</h2>
          </div>
          <button
            type="button"
            className={s.more}
            onClick={() => cart.restaurant && push('restaurant', { restaurantId: cart.restaurant.id })}
          >
            افزودن غذا
          </button>
        </div>
        <ul className={s.lines} aria-label="غذاهای سبد">
          {cart.lines.map((l) => (
            <li key={l.lineId}>
              <CartItemRow
                item={{
                  name: l.title,
                  art: l.imageUrl,
                  optionsText: l.options.map((o) => o.title).join('، '),
                  total: l.unitPrice * l.qty,
                  unavailable: off.has(l.foodId),
                }}
                qtyText={toFaDigits(l.qty)}
                onInc={() => cart.inc(l.lineId)}
                onDec={() => cart.dec(l.lineId)}
              />
            </li>
          ))}
        </ul>
        <label htmlFor="cart-note" className="visually-hidden">
          یادداشت سفارش
        </label>
        <textarea
          id="cart-note"
          className={s.noteInput}
          maxLength={300}
          placeholder="یادداشت برای رستوران (اختیاری)"
          value={cart.note}
          onChange={(e) => cart.setNote(e.target.value)}
        />
        <PromoCodeInput
          value={code}
          status={promoShown ? (promo?.status === 'ok' ? 'ok' : 'err') : ''}
          message={promoShown ? promo?.message : undefined}
          busy={loading}
          onInput={setCode}
          onApply={() => cart.setPromo(code.trim())}
        />
        <section aria-label="خلاصه‌ی پرداخت">
          {quote ? (
            <PriceSummary
              rows={summaryRows(quote)}
              totalLabel="مبلغ قابل پرداخت"
              totalValue={formatMoney(quote.total ?? 0)}
            />
          ) : error ? null : (
            <div className={s.quoting} role="status" aria-label="در حال محاسبه‌ی قیمت" />
          )}
        </section>
        {error ? (
          <div className={s.alert} role="alert">
            محاسبه‌ی قیمت انجام نشد.
            <button type="button" onClick={retry}>
              تلاش دوباره
            </button>
          </div>
        ) : null}
        {blocked ? (
          <p className={s.alert} role="status">
            {blocked}
          </p>
        ) : null}
      </div>
      <div className={s.dock}>
        <Button size="lg" block disabled={!canGo} onClick={() => openGuarded('checkout')}>
          ادامه و تکمیل سفارش · {formatMoney(total)}
        </Button>
      </div>
    </div>
  );
}
