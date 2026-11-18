import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { OverlayHost } from '@/app/OverlayHost';
import { useSession } from '@/auth/session';
import { useCart } from '@/cart/cart';
import { useAddresses } from '@/features/addresses';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { AccountScreen } from '../AccountScreen';
import { OrdersScreen } from './OrdersScreen';

const nav = () => useNav.getState();
const top = () => nav().stack.at(-1)!;
const login = () =>
  useSession.getState().setSession({
    accessToken: 'a',
    refreshToken: 'r',
    user: { id: 'u1', phone: '09131234567', name: 'امیر' },
  });
const accountRoute = (): Route => nav().stack.find((r) => r.screen === 'account')!;

beforeEach(() => {
  useSession.getState().clear();
  useCart.getState().clear();
  useAddresses.getState().clear();
  nav().resetTo('account');
});

describe('<AccountScreen /> — spec §6 account', () => {
  it('guest: login button, public items only, no logout', () => {
    render(<AccountScreen route={accountRoute()} />);
    expect(screen.getByRole('button', { name: 'ورود یا ثبت‌نام' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^تنظیمات/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^درباره ما و قوانین/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /خروج از حساب/ })).toBeNull();
  });

  it('logged in: greeting, phone, live badges for active orders and unread notifications', async () => {
    login();
    render(<AccountScreen route={accountRoute()} />);
    expect(screen.getByText('سلام امیر عزیز')).toBeInTheDocument();
    expect(screen.getByText('۰۹۱۳ ۱۲۳ ۴۵۶۷')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /^اعلان‌ها/ })).toHaveTextContent('۲'));
    expect(screen.getByRole('button', { name: /^سفارش‌ها/ })).toHaveTextContent('۱');
  });

  it.each([
    [/^سفارش‌ها/, 'orders'],
    [/^علاقه‌مندی‌ها/, 'favs'],
    [/^آدرس‌های من/, 'addresses'],
    [/^اعلان‌ها/, 'notifs'],
    [/^کدهای تخفیف/, 'promos'],
    [/^تنظیمات/, 'settings'],
    [/^درباره ما و قوانین/, 'about'],
    [/^ویرایش پروفایل/, 'editprof'],
  ])('%s → %s', async (name, target) => {
    login();
    render(<AccountScreen route={accountRoute()} />);
    await userEvent.click(screen.getByRole('button', { name }));
    expect(top().screen).toBe(target);
  });

  it('logout asks first, then clears the session and goes home', async () => {
    login();
    render(
      <>
        <AccountScreen route={accountRoute()} />
        <OverlayHost />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: /خروج از حساب/ }));
    const dlg = screen.getByRole('alertdialog', { name: 'خروج از حساب' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'خروج' }));
    expect(useSession.getState().accessToken).toBeNull();
    expect(nav().stack.map((r) => r.screen)).toEqual(['home']);
  });
});

describe('<OrdersScreen /> — spec §4 orders', () => {
  const route = (): Route => nav().stack.find((r) => r.screen === 'orders')!;
  beforeEach(() => {
    login();
    nav().push('orders');
  });

  it('active tab: order card with «پیگیری» → track', async () => {
    render(<OrdersScreen route={route()} />);
    expect(screen.getByRole('tab', { name: 'فعال' })).toHaveAttribute('aria-selected', 'true');
    const card = await screen.findByRole('button', { name: /سفارش ۱۰۲۵۴ از کباب‌سرای نقش‌جهان/ });
    expect(card).toHaveTextContent('در حال آماده‌سازی');
    await userEvent.click(within(card).getByRole('button', { name: 'پیگیری' }));
    expect(top()).toMatchObject({ screen: 'track', params: { orderId: 'o1' } });
  });

  it('past tab: «سفارش مجدد» fills the cart with current prices and opens it', async () => {
    render(<OrdersScreen route={route()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'گذشته' }));
    const card = await screen.findByRole('button', { name: /سفارش ۱۰۱۹۸ از برگر لاین/ });
    expect(card).toHaveTextContent('تحویل شد');
    await userEvent.click(within(card).getByRole('button', { name: 'سفارش مجدد' }));
    await waitFor(() => expect(top().screen).toBe('cart'));
    expect(useCart.getState().restaurant?.id).toBe('burger');
    expect(useCart.getState().lines).toEqual([
      expect.objectContaining({ foodId: 'b4', qty: 1, unitPrice: 310000 }),
    ]);
  });

  it('reorder with another restaurant in the cart asks before replacing it', async () => {
    useCart
      .getState()
      .add(
        { id: 'naghsh', name: 'کباب‌سرای نقش‌جهان' },
        { foodId: 'n2', title: 'کباب برگ', unitPrice: 420000, options: [] },
      );
    render(
      <>
        <OrdersScreen route={route()} />
        <OverlayHost />
      </>,
    );
    await userEvent.click(screen.getByRole('tab', { name: 'گذشته' }));
    const card = await screen.findByRole('button', { name: /سفارش ۱۰۱۹۸/ });
    await userEvent.click(within(card).getByRole('button', { name: 'سفارش مجدد' }));
    const dlg = await screen.findByRole('alertdialog', { name: 'سبد خرید قبلی خالی شود؟' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'خالی کردن سبد و ادامه' }));
    await waitFor(() => expect(top().screen).toBe('cart'));
    expect(useCart.getState().restaurant?.id).toBe('burger');
  });

  it('no orders → empty state with a way to restaurants', async () => {
    server.use(http.get('*/v1/orders', () => HttpResponse.json({ items: [], nextCursor: null })));
    render(<OrdersScreen route={route()} />);
    expect(await screen.findByRole('heading', { name: 'سفارش فعالی ندارید' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'رفتن به رستوران‌ها' }));
    expect(top().screen).toBe('restaurants');
  });

  it('tapping a card opens tracking', async () => {
    render(<OrdersScreen route={route()} />);
    await userEvent.click(await screen.findByRole('button', { name: /سفارش ۱۰۲۵۴/ }));
    expect(top()).toMatchObject({ screen: 'track', params: { orderId: 'o1' } });
  });
});
