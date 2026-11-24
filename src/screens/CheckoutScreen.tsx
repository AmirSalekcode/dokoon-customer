import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import { useCart } from '@/cart/cart';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { EmptyState } from '@/components/library/EmptyState';
import { PriceSummary } from '@/components/library/PriceSummary';
import { SelectCard } from '@/components/library/SelectCard';
import { TopBar } from '@/components/library/TopBar';
import { ICONS } from '@/components/primitives/Icon';
import { selectedAddress, useAddresses } from '@/features/addresses';
import {
  PRICE_CHANGED_TEXT,
  summaryRows,
  toDraft,
  unavailableFoods,
  usePayMethod,
  useQuote,
  type PayMethod,
} from '@/features/checkout';
import { formatMoney, isValidPhone, normalizePhone, toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from './registry';
import s from './cart/cart.module.css';
import c from './cart/checkout.module.css';

const newKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** Checkout (screen-specs §3): recipient, address, delivery time (info only), payment, summary. */
export function CheckoutScreen(_: ScreenProps) {
  const cart = useCart();
  const { back, push, resetTo, openOverlay } = useNav.getState();
  const addresses = useAddresses();
  const address = selectedAddress(addresses);
  const { quote, loading, error, retry } = useQuote(address?.id ?? '');
  const [mode, setMode] = useState<'self' | 'other'>('self');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const method = usePayMethod((st) => st.method);
  const setMethod = usePayMethod((st) => st.set);
  const [busy, setBusy] = useState(false);
  /** One Idempotency-Key per draft: retries of the same order reuse it. */
  const idem = useRef<{ draft: string; key: string } | null>(null);

  useEffect(() => {
    void useAddresses.getState().load();
  }, []);

  if (cart.lines.length === 0) {
    return (
      <div className={s.pageNoNav}>
        <TopBar title="تکمیل سفارش" onBack={() => back()} />
        <EmptyState
          art="dk-burger"
          title="سبد خرید شما خالی است"
          text="برای ثبت سفارش ابتدا غذایی به سبد اضافه کنید."
          action={<Button onClick={() => resetTo('restaurants')}>رفتن به رستوران‌ها</Button>}
        />
      </div>
    );
  }

  const methods = (quote?.payMethods ?? ['online']) as PayMethod[];
  const pay: PayMethod = methods.includes(method) ? method : 'online';
  const phoneErr = mode === 'other' && phone && !isValidPhone(phone) ? 'شماره موبایل معتبر نیست' : undefined;
  const recipientOk = mode === 'self' || (name.trim().length > 1 && isValidPhone(phone));
  // No minimum order (owner decision D-89): only unavailable foods block the order.
  const blocked = unavailableFoods(quote).size > 0;
  const canSubmit = !!address && !!quote && !loading && !error && !blocked && recipientOk && !busy;

  const submit = async () => {
    if (!address?.id) return;
    const draft = toDraft(cart, {
      addressId: address.id,
      payMethod: pay,
      recipient:
        mode === 'self'
          ? { mode: 'self' }
          : { mode: 'other', name: name.trim(), phone: normalizePhone(phone) },
    });
    const sig = JSON.stringify(draft);
    if (idem.current?.draft !== sig) idem.current = { draft: sig, key: newKey() };
    setBusy(true);
    try {
      const {
        data,
        error: err,
        response,
      } = await api.POST('/orders', {
        params: { header: { 'Idempotency-Key': idem.current.key } },
        body: draft,
      });
      if (err !== undefined || !data?.order) {
        if (response.status === 409) {
          toast(PRICE_CHANGED_TEXT, 'error');
          idem.current = null;
          retry();
        } else toast('ثبت سفارش انجام نشد. دوباره تلاش کنید.', 'error');
        return;
      }
      const o = data.order;
      if (pay === 'cash') {
        const total = String(o.totals?.total ?? quote?.total ?? 0);
        cart.clear();
        resetTo('home');
        push('paid', { orderId: o.id ?? '', number: o.number ?? '', method: 'cash', total });
      } else {
        push('gateway', { orderId: o.id ?? '', url: data.payment?.redirectUrl ?? '' });
      }
    } catch {
      toast('ثبت سفارش انجام نشد. دوباره تلاش کنید.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const total = quote?.total ?? 0;
  return (
    <div className={s.pageNoNav}>
      <TopBar title="تکمیل سفارش" onBack={() => back()} />
      <div className={s.body}>
        <section aria-labelledby="co-recipient" className={c.block}>
          <h2 id="co-recipient" className={c.h}>
            گیرنده
          </h2>
          <div role="radiogroup" aria-labelledby="co-recipient" className={c.choices}>
            <SelectCard
              radio
              title="برای خودم"
              icon={ICONS.user}
              selected={mode === 'self'}
              onPick={() => setMode('self')}
            />
            <SelectCard
              radio
              title="برای شخص دیگر"
              icon={ICONS.user}
              selected={mode === 'other'}
              onPick={() => setMode('other')}
            />
          </div>
          {mode === 'other' ? (
            <div className={c.fields}>
              <TextField label="نام گیرنده" value={name} onChange={setName} autoComplete="name" />
              <TextField
                label="موبایل گیرنده"
                value={phone}
                onChange={setPhone}
                numeric
                maxDigits={11}
                autoComplete="tel"
                error={phoneErr}
              />
            </div>
          ) : null}
        </section>

        <section aria-labelledby="co-address" className={c.block}>
          <h2 id="co-address" className={c.h}>
            آدرس تحویل
          </h2>
          {address ? (
            <SelectCard
              title={address.title ?? ''}
              sub={address.fullText}
              icon={ICONS.pin}
              selected
              actionLabel="تغییر"
              onAction={() => openOverlay({ kind: 'address' })}
            />
          ) : addresses.loaded ? (
            <div className={c.empty}>
              <p>هنوز آدرسی ثبت نکرده‌اید</p>
              <Button variant="secondary" onClick={() => push('addaddr')}>
                افزودن آدرس
              </Button>
            </div>
          ) : (
            <div className={s.quoting} role="status" aria-label="در حال بارگذاری آدرس‌ها" />
          )}
        </section>

        <section aria-labelledby="co-time" className={c.block}>
          <h2 id="co-time" className={c.h}>
            زمان تحویل
          </h2>
          <p className={c.info}>
            {quote?.etaMin != null && quote.etaMax != null
              ? `ارسال حدود ${toFaDigits(quote.etaMin)} تا ${toFaDigits(quote.etaMax)} دقیقه‌ی دیگر`
              : 'زمان ارسال را رستوران تعیین می‌کند'}
          </p>
        </section>

        <section aria-labelledby="co-pay" className={c.block}>
          <h2 id="co-pay" className={c.h}>
            روش پرداخت
          </h2>
          <div role="radiogroup" aria-labelledby="co-pay" className={c.choices}>
            <SelectCard
              radio
              title="پرداخت آنلاین"
              sub="درگاه امن بانکی"
              icon={ICONS.card}
              selected={pay === 'online'}
              onPick={() => setMethod('online')}
            />
            {methods.includes('cash') ? (
              <SelectCard
                radio
                title="نقدی هنگام تحویل"
                sub="پرداخت به پیک"
                icon={ICONS.wallet}
                selected={pay === 'cash'}
                onPick={() => setMethod('cash')}
              />
            ) : null}
          </div>
        </section>

        <section aria-labelledby="co-sum" className={c.block}>
          <h2 id="co-sum" className={c.h}>
            خلاصه‌ی سفارش
          </h2>
          <ul className={c.lines}>
            {cart.lines.map((l) => (
              <li key={l.lineId}>
                <span>
                  {toFaDigits(l.qty)}× {l.title}
                  {l.options.length ? <small> ({l.options.map((o) => o.title).join('، ')})</small> : null}
                </span>
                <span>{formatMoney(l.unitPrice * l.qty)}</span>
              </li>
            ))}
          </ul>
          {cart.note.trim() ? <p className={c.note}>یادداشت: {cart.note.trim()}</p> : null}
          {quote ? (
            <PriceSummary
              rows={summaryRows(quote)}
              totalLabel="مبلغ قابل پرداخت"
              totalValue={formatMoney(total)}
            />
          ) : null}
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
            سبد شما تغییر کرده است؛ به سبد خرید برگردید.
          </p>
        ) : null}
      </div>
      <div className={s.dockNoNav}>
        <Button size="lg" block disabled={!canSubmit} onClick={() => void submit()}>
          {pay === 'cash' ? 'ثبت سفارش' : 'ثبت سفارش و پرداخت'}
          {quote ? ` · ${formatMoney(total)}` : ''}
        </Button>
      </div>
    </div>
  );
}
