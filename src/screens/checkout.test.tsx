import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '@/auth/session';
import { useCart } from '@/cart/cart';
import { useAddresses } from '@/features/addresses';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { useToast } from '@/ui/toast';
import { CheckoutScreen } from './CheckoutScreen';

const route: Route = { key: 'checkout', screen: 'checkout', params: {} };
const nav = () => useNav.getState();
const top = () => nav().stack.at(-1)!;
const HOME = {
  title: 'خانه',
  fullText: 'شهرضا، خیابان امام، کوچه‌ی ۱۲',
  location: { lat: 32.0089, lng: 51.8668 },
  recipientName: 'امیر',
  recipientPhone: '09131234567',
};

async function withAddress() {
  const r = await useAddresses.getState().add(HOME);
  if (!r.ok) throw new Error(r.message);
}

beforeEach(() => {
  useSession.getState().clear();
  useSession.getState().setSession({ accessToken: 'a', refreshToken: 'r' });
  useAddresses.getState().clear();
  useCart.getState().clear();
  useCart
    .getState()
    .add(
      { id: 'naghsh', name: 'کباب‌سرای نقش‌جهان' },
      { foodId: 'n2', title: 'کباب برگ', unitPrice: 420000, options: [] },
    );
  nav().resetTo('cart');
  nav().push('checkout');
});

const submit = () => screen.getByRole('button', { name: /^ثبت سفارش/ });

describe('<CheckoutScreen /> — spec §3 checkout', () => {
  it('no address yet → «افزودن آدرس» opens addaddr; submit disabled', async () => {
    render(<CheckoutScreen route={route} />);
    expect(await screen.findByText('هنوز آدرسی ثبت نکرده‌اید')).toBeInTheDocument();
    expect(submit()).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'افزودن آدرس' }));
    expect(top().screen).toBe('addaddr');
  });

  it('shows the selected address; «تغییر» opens the address sheet', async () => {
    await withAddress();
    render(<CheckoutScreen route={route} />);
    const addr = await screen.findByRole('region', { name: 'آدرس تحویل' });
    expect(await within(addr).findByText('خانه')).toBeInTheDocument();
    await userEvent.click(within(addr).getByRole('button', { name: 'تغییر' }));
    expect(nav().overlay).toMatchObject({ kind: 'address' });
  });

  it('delivery time is information only (set by the restaurant)', async () => {
    await withAddress();
    render(<CheckoutScreen route={route} />);
    const time = await screen.findByRole('region', { name: 'زمان تحویل' });
    await waitFor(() => expect(time).toHaveTextContent('ارسال حدود ۲۵ تا ۳۵ دقیقه‌ی دیگر'));
    expect(within(time).queryByRole('radio')).toBeNull();
    expect(within(time).queryByRole('button')).toBeNull();
  });

  it('recipient «برای شخص دیگر» requires a name and a valid mobile', async () => {
    await withAddress();
    render(<CheckoutScreen route={route} />);
    await waitFor(() => expect(submit()).toBeEnabled());
    await userEvent.click(screen.getByRole('radio', { name: 'برای شخص دیگر' }));
    expect(submit()).toBeDisabled();
    await userEvent.type(screen.getByLabelText('نام گیرنده'), 'سارا');
    await userEvent.type(screen.getByLabelText('موبایل گیرنده'), '0912');
    expect(screen.getByText('شماره موبایل معتبر نیست')).toBeInTheDocument();
    expect(submit()).toBeDisabled();
    await userEvent.type(screen.getByLabelText('موبایل گیرنده'), '۱۲۳۴۵۶۷');
    expect(submit()).toBeEnabled();
  });

  it('cash appears only when the restaurant allows it', async () => {
    await withAddress();
    useCart.getState().clear();
    useCart
      .getState()
      .add(
        { id: 'burger', name: 'برگر لاین' },
        { foodId: 'b4', title: 'پیتزا پپرونی', unitPrice: 310000, options: [] },
      );
    render(<CheckoutScreen route={route} />);
    const pay = await screen.findByRole('radiogroup', { name: 'روش پرداخت' });
    expect(within(pay).getByRole('radio', { name: /آنلاین/ })).toBeChecked();
    expect(within(pay).queryByRole('radio', { name: /نقدی/ })).toBeNull();
  });

  it('cash order: POST /orders with an Idempotency-Key → paid (home underneath), cart emptied', async () => {
    await withAddress();
    let key: string | null = null;
    let body: Record<string, unknown> = {};
    server.use(
      http.post('*/v1/orders', async ({ request }) => {
        key = request.headers.get('Idempotency-Key');
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            order: {
              id: 'o9',
              number: '10301',
              status: 'PLACED',
              payMethod: 'cash',
              totals: { total: 465000 },
            },
            payment: null,
          },
          { status: 201 },
        );
      }),
    );
    useCart.getState().setNote('زنگ نزنید');
    render(<CheckoutScreen route={route} />);
    await userEvent.click(await screen.findByRole('radio', { name: /نقدی هنگام تحویل/ }));
    await waitFor(() => expect(submit()).toBeEnabled());
    await userEvent.click(submit());
    await waitFor(() => expect(top().screen).toBe('paid'));
    expect(nav().stack.map((r) => r.screen)).toEqual(['home', 'paid']);
    expect(top().params).toMatchObject({ orderId: 'o9', number: '10301', method: 'cash', total: '465000' });
    expect(key).toMatch(/.{8,}/);
    expect(body).toMatchObject({
      restaurantId: 'naghsh',
      payMethod: 'cash',
      addressId: 'a1',
      note: 'زنگ نزنید',
      recipient: { mode: 'self' },
      lines: [{ foodId: 'n2', qty: 1, optionIds: [] }],
    });
    expect(useCart.getState().lines).toHaveLength(0);
  });

  it('online order → gateway with the payment url; the cart is kept', async () => {
    await withAddress();
    render(<CheckoutScreen route={route} />);
    await waitFor(() => expect(submit()).toBeEnabled());
    await userEvent.click(submit());
    await waitFor(() => expect(top().screen).toBe('gateway'));
    expect(top().params).toMatchObject({ orderId: 'o-new' });
    expect(useCart.getState().lines).toHaveLength(1);
  });

  it('a retry after a failed request reuses the same Idempotency-Key', async () => {
    await withAddress();
    const keys: (string | null)[] = [];
    server.use(
      http.post('*/v1/orders', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return keys.length === 1
          ? HttpResponse.json({ code: 'X', message: 'x' }, { status: 503 })
          : HttpResponse.json(
              {
                order: { id: 'o-new', number: '1', status: 'PENDING_PAYMENT' },
                payment: { redirectUrl: 'about:blank' },
              },
              { status: 201 },
            );
      }),
    );
    render(<CheckoutScreen route={route} />);
    await waitFor(() => expect(submit()).toBeEnabled());
    await userEvent.click(submit());
    await waitFor(() =>
      expect(useToast.getState().toasts[0]?.text).toBe('ثبت سفارش انجام نشد. دوباره تلاش کنید.'),
    );
    await userEvent.click(submit());
    await waitFor(() => expect(top().screen).toBe('gateway'));
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  it('409 (price/availability changed) → message and a fresh quote; stays on checkout', async () => {
    await withAddress();
    server.use(
      http.post('*/v1/orders', () =>
        HttpResponse.json({ code: 'PRICE_CHANGED', message: 'قیمت تغییر کرد' }, { status: 409 }),
      ),
    );
    render(<CheckoutScreen route={route} />);
    await waitFor(() => expect(submit()).toBeEnabled());
    await userEvent.click(submit());
    await waitFor(() =>
      expect(useToast.getState().toasts[0]?.text).toBe(
        'قیمت یا موجودی تغییر کرد؛ سفارش را دوباره بررسی کنید.',
      ),
    );
    expect(top().screen).toBe('checkout');
  });

  it('shows the order summary with the cart note', async () => {
    await withAddress();
    useCart.getState().setNote('بدون پیاز');
    render(<CheckoutScreen route={route} />);
    const sum = await screen.findByRole('region', { name: 'خلاصه‌ی سفارش' });
    expect(sum).toHaveTextContent('کباب برگ');
    expect(sum).toHaveTextContent('بدون پیاز');
    await waitFor(() => expect(sum).toHaveTextContent('مبلغ قابل پرداخت۴۶۵٬۰۰۰ تومان'));
  });
});
