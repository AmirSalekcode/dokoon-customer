import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useCart } from '@/cart/cart';
import { useAddresses } from '@/features/addresses';
import { toDraft, usePayMethod } from '@/features/checkout';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { GatewayScreen } from './GatewayScreen';
import { PayFailScreen } from './PayFailScreen';

const nav = () => useNav.getState();
const top = () => nav().stack.at(-1)!;
const screens = () => nav().stack.map((r) => r.screen);

let orderId = '';

async function placeOnlineOrder(restaurant = { id: 'naghsh', name: 'کباب‌سرای نقش‌جهان' }, foodId = 'n2') {
  useCart.getState().clear();
  useCart.getState().add(restaurant, { foodId, title: 'غذا', unitPrice: 420000, options: [] });
  const a = await useAddresses.getState().add({
    title: 'خانه',
    fullText: 'الف',
    location: { lat: 32.0089, lng: 51.8668 },
    recipientName: 'امیر',
    recipientPhone: '09131234567',
  });
  if (!a.ok) throw new Error(a.message);
  const { data } = await api.POST('/orders', {
    params: { header: { 'Idempotency-Key': 'k1' } },
    body: toDraft(useCart.getState(), { addressId: a.address.id, payMethod: 'online' }),
  });
  orderId = data!.order!.id!;
  nav().resetTo('cart');
  nav().push('checkout');
  nav().push('gateway', { orderId, url: data!.payment!.redirectUrl! });
}

const gw = (): Route => top();

beforeEach(async () => {
  useSession.getState().setSession({ accessToken: 'a', refreshToken: 'r' });
  useAddresses.getState().clear();
  usePayMethod.getState().set('online');
  await placeOnlineOrder();
});

describe('<GatewayScreen /> — spec §3 gateway (simulator until Zibal/ZarinPal is chosen)', () => {
  it('shows the amount and the test-gateway notice', async () => {
    render(<GatewayScreen route={gw()} />);
    expect(await screen.findByText('۴۶۵٬۰۰۰ تومان')).toBeInTheDocument();
    expect(screen.getByText(/درگاه آزمایشی/)).toBeInTheDocument();
  });

  it('success → server-verified order → paid (online), cart emptied, home underneath', async () => {
    render(<GatewayScreen route={gw()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'پرداخت موفق' }));
    await waitFor(() => expect(top().screen).toBe('paid'));
    expect(screens()).toEqual(['home', 'paid']);
    expect(top().params).toMatchObject({ orderId, method: 'online' });
    expect(useCart.getState().lines).toHaveLength(0);
  });

  it('failure → payfail replaces the gateway; cart kept', async () => {
    render(<GatewayScreen route={gw()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'پرداخت ناموفق' }));
    await waitFor(() => expect(top().screen).toBe('payfail'));
    expect(screens()).toEqual(['cart', 'checkout', 'payfail']);
    expect(useCart.getState().lines).toHaveLength(1);
  });

  it('system back = cancel → payfail', async () => {
    render(<GatewayScreen route={gw()} />);
    await screen.findByRole('button', { name: 'انصراف' });
    expect(nav().handleSystemBack()).toBe('intercepted');
    await waitFor(() => expect(top().screen).toBe('payfail'));
  });

  it('timeout → 504 error page', async () => {
    render(<GatewayScreen route={gw()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'پایان مهلت پرداخت' }));
    await waitFor(() => expect(top()).toMatchObject({ screen: 'error', params: { kind: 'e504' } }));
  });
});

describe('<PayFailScreen /> — spec §3 payfail', () => {
  const failed = async () => {
    await api.GET('/payments/callback/{provider}', {
      params: { path: { provider: 'zibal' }, query: { orderId, result: 'fail' } as never },
    });
    nav().setTop('payfail', { orderId });
    return top();
  };

  it('explains the failure; «تلاش دوباره» starts a new payment attempt → gateway', async () => {
    render(<PayFailScreen route={await failed()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'پرداخت ناموفق بود' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'تلاش دوباره' }));
    await waitFor(() => expect(top().screen).toBe('gateway'));
    expect(top().params).toMatchObject({ orderId });
    expect(screens()).toEqual(['cart', 'checkout', 'gateway']);
  });

  it('«انتخاب پرداخت نقدی» (when the restaurant allows cash) → back to checkout with cash chosen', async () => {
    render(<PayFailScreen route={await failed()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'انتخاب پرداخت نقدی' }));
    expect(top().screen).toBe('checkout');
    expect(usePayMethod.getState().method).toBe('cash');
    expect(useCart.getState().lines).toHaveLength(1);
  });

  it('no cash option when the restaurant does not allow it', async () => {
    await placeOnlineOrder({ id: 'burger', name: 'برگر لاین' }, 'b4');
    render(<PayFailScreen route={await failed()} />);
    await screen.findByRole('button', { name: 'تلاش دوباره' });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'انتخاب پرداخت نقدی' })).toBeNull());
  });
});
