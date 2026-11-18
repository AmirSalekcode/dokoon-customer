import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OverlayHost } from '@/app/OverlayHost';
import { useSession } from '@/auth/session';
import { useCart } from '@/cart/cart';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route, ScreenId } from '@/nav/types';
import { useToast } from '@/ui/toast';
import { NotificationsScreen } from './NotificationsScreen';
import { PromosScreen } from './PromosScreen';
import { SettingsScreen } from './SettingsScreen';

const nav = () => useNav.getState();
const top = () => nav().stack.at(-1)!;
const open = (screen: ScreenId): Route => {
  nav().push(screen);
  return top();
};
const login = () =>
  useSession.getState().setSession({
    accessToken: 'a',
    refreshToken: 'r',
    user: { id: 'u1', phone: '09131234567', name: 'امیر', unreadNotifications: 2 },
  });

beforeEach(() => {
  useSession.getState().clear();
  useCart.getState().clear();
  nav().resetTo('account');
});

describe('<NotificationsScreen /> — spec §6 notifs', () => {
  beforeEach(login);

  it('unread items are marked; tapping one marks it read and opens its target', async () => {
    let body: unknown;
    server.use(
      http.post('*/v1/notifications/read', async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<NotificationsScreen route={open('notifs')} />);
    const list = await screen.findByRole('list', { name: 'اعلان‌ها' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    const first = within(list).getByRole('button', { name: /سفارش شما در حال آماده شدن است/ });
    expect(first).toHaveAccessibleName(/خوانده‌نشده/);
    await userEvent.click(first);
    expect(body).toEqual({ ids: ['nt1'] });
    expect(top()).toMatchObject({ screen: 'track', params: { orderId: 'o1' } });
  });

  it('restaurant target opens the restaurant', async () => {
    render(<NotificationsScreen route={open('notifs')} />);
    await userEvent.click(await screen.findByRole('button', { name: /۱۵٪ تخفیف اولین سفارش/ }));
    expect(top()).toMatchObject({ screen: 'restaurant', params: { restaurantId: 'naghsh' } });
  });

  it('«خواندن همه» marks everything read', async () => {
    render(<NotificationsScreen route={open('notifs')} />);
    await screen.findByRole('list', { name: 'اعلان‌ها' });
    await userEvent.click(screen.getByRole('button', { name: 'خواندن همه' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /خوانده‌نشده/ })).toBeNull());
    expect(useSession.getState().user?.unreadNotifications).toBe(0);
  });

  it('empty → EmptyState', async () => {
    server.use(http.get('*/v1/notifications', () => HttpResponse.json({ items: [], nextCursor: null })));
    render(<NotificationsScreen route={open('notifs')} />);
    expect(await screen.findByRole('heading', { name: 'اعلانی ندارید' })).toBeInTheDocument();
  });
});

describe('<PromosScreen /> — spec §6 promos', () => {
  beforeEach(login);

  it('shows codes; «استفاده» copies the code and applies it to the cart', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    useCart
      .getState()
      .add(
        { id: 'naghsh', name: 'کباب‌سرای نقش‌جهان' },
        { foodId: 'n2', title: 'کباب برگ', unitPrice: 420000, options: [] },
      );
    render(<PromosScreen route={open('promos')} />);
    await userEvent.click(await screen.findByRole('button', { name: 'استفاده کد DOKOON10' }));
    expect(writeText).toHaveBeenCalledWith('DOKOON10');
    expect(useCart.getState().promoCode).toBe('DOKOON10');
    expect(useToast.getState().toasts[0]?.text).toBe('کد DOKOON10 روی سبد خرید اعمال شد');
  });

  it('with an empty cart the code is only copied', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<PromosScreen route={open('promos')} />);
    await userEvent.click(await screen.findByRole('button', { name: 'استفاده کد FIRST20' }));
    expect(useCart.getState().promoCode).toBe('');
    expect(useToast.getState().toasts[0]?.text).toBe('کد FIRST20 کپی شد');
  });
});

describe('<SettingsScreen /> — spec §6 settings', () => {
  it('guest: theme, city, map service, cookies; no notification switches or delete', async () => {
    render(<SettingsScreen route={open('settings')} />);
    expect(screen.getByRole('radiogroup', { name: 'تم' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'سرویس نقشه' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تنظیمات کوکی' })).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: 'حذف حساب کاربری' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^شهر/ }));
    expect(top()).toMatchObject({ screen: 'city', params: { from: 'settings' } });
  });

  it('map service choice is shared with the add-address map (dk-map)', async () => {
    render(<SettingsScreen route={open('settings')} />);
    await userEvent.click(screen.getByRole('radio', { name: 'بلد' }));
    expect(localStorage.getItem('dk-map')).toBe('"balad"');
  });

  it('logged in: notification switches load from and save to /me/settings', async () => {
    login();
    let saved: Record<string, boolean> | undefined;
    server.use(
      http.put('*/v1/me/settings', async ({ request }) => {
        saved = (await request.json()) as Record<string, boolean>;
        return HttpResponse.json(saved);
      }),
    );
    render(<SettingsScreen route={open('settings')} />);
    const promos = await screen.findByRole('switch', { name: /تخفیف‌ها و پیشنهادها/ });
    await waitFor(() => expect(promos).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByRole('switch', { name: /اخبار دکون/ })).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(promos);
    expect(promos).toHaveAttribute('aria-checked', 'false');
    await waitFor(() =>
      expect(saved).toEqual({ notifyOrders: true, notifyPromos: false, notifyNews: false }),
    );
  });

  it('delete account asks first, then signs out and goes home', async () => {
    login();
    render(
      <>
        <SettingsScreen route={open('settings')} />
        <OverlayHost />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'حذف حساب کاربری' }));
    const dlg = screen.getByRole('alertdialog', { name: 'حذف حساب کاربری' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'حذف حساب' }));
    await waitFor(() => expect(nav().stack.map((r) => r.screen)).toEqual(['home']));
    expect(useSession.getState().accessToken).toBeNull();
  });
});
