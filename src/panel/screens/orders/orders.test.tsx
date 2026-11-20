import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { addIncomingOrder, db } from '../../mocks/db';
import { panelHandlers, resetPanelMockDb } from '../../mocks/handlers';
import { usePanelNav } from '../../nav/nav';
import { useLive } from '../../realtime/live';
import { PanelShell } from '../../shell/PanelShell';
import { localDate, useHistory } from '../../state/history';
import { useOrders } from '../../state/orders';
import { useOrdersUi } from '../../state/ordersUi';
import { useRestaurant } from '../../state/restaurant';
import { signedIn, signedOut, testStream } from '../../test/session';

// KAN-63: orders list — status tabs with live counters, card actions, history chips + pagination.
beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  localStorage.clear();
  useToast.setState({ toasts: [] });
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  useOrders.getState().reset();
  useOrdersUi.getState().reset();
  useHistory.getState().reset();
  usePanelNav.getState().resetTo('login');
});
afterEach(() => signedOut());

async function boot() {
  signedIn();
  render(<PanelShell />);
  await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' });
  await waitFor(() => expect(useLive.getState().status).toBe('open'));
  await waitFor(() => expect(useOrders.getState().status).toBe('ready'));
}
const tab = (name: string) => screen.getByRole('tab', { name });
const tiles = () => screen.queryAllByTestId('order-tile');
const toastText = () => useToast.getState().toasts[0]?.text;

describe('orders list', () => {
  it('tabs show live counters, «new» is hot, and the nav badge counts new orders', async () => {
    await boot();
    expect(tab('جدید ۲')).toHaveAttribute('aria-selected', 'true');
    expect(tab('جدید ۲').className).toMatch(/hot/);
    expect(tab('در حال آماده‌سازی ۱')).toBeInTheDocument();
    expect(tab('آماده / در مسیر ۲')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'سفارش‌ها، ۲ سفارش جدید' })).toBeInTheDocument();
    expect(tiles()).toHaveLength(2);

    const o = addIncomingOrder();
    act(() => testStream.emit({ event: 'order.created', data: o }));
    expect(tab('جدید ۳')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'سفارش‌ها، ۳ سفارش جدید' })).toBeInTheDocument();
    expect(tiles()).toHaveLength(3);

    // Accepted on another device: it moves from «new» to «prep».
    act(() => testStream.emit({ event: 'order.updated', data: { ...o, status: 'prep', prepMinutes: 20 } }));
    expect(tab('جدید ۲')).toBeInTheDocument();
    expect(tab('در حال آماده‌سازی ۲')).toBeInTheDocument();
  });

  it('no new orders: no counter, not hot, no badge, empty text', async () => {
    db.orders = db.orders.filter((o) => o.status !== 'new');
    await boot();
    expect(tab('جدید').className).not.toMatch(/hot/);
    expect(screen.getByRole('button', { name: 'سفارش‌ها' })).toBeInTheDocument();
    expect(screen.getByText('سفارش جدیدی نیست')).toBeInTheDocument();
    expect(screen.getByText('همین که سفارشی برسد، با صدا به شما خبر می‌دهیم.')).toBeInTheDocument();
  });

  it('card action: prep → ready → way', async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(tab('در حال آماده‌سازی ۱'));
    await user.click(screen.getByRole('button', { name: 'سفارش آماده است' }));
    await waitFor(() => expect(tab('آماده / در مسیر ۳')).toBeInTheDocument());
    expect(toastText()).toBe('سفارش آماده شد؛ پیک مطلع می‌شود');
    expect(screen.getByText('سفارشی در حال آماده‌سازی نیست')).toBeInTheDocument();

    await user.click(tab('آماده / در مسیر ۳'));
    const handovers = screen.getAllByRole('button', { name: 'تحویل به پیک شد' });
    expect(handovers).toHaveLength(2);
    await user.click(handovers[0]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'تحویل به پیک شد' })).toHaveLength(1));
    expect(toastText()).toBe('تحویل به پیک ثبت شد');
  });

  it('409 (changed elsewhere): toast with the server message and the order is re-read', async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(tab('در حال آماده‌سازی ۱'));
    // Another device already marked it ready, without a live event reaching this one.
    db.orders.find((o) => o.status === 'prep')!.status = 'ready';
    await user.click(screen.getByRole('button', { name: 'سفارش آماده است' }));
    await waitFor(() => expect(toastText()).toBe('وضعیت این سفارش تغییر کرده است؛ صفحه را تازه کنید'));
    await waitFor(() => expect(tab('آماده / در مسیر ۳')).toBeInTheDocument());
  });

  it('history: date chips (default 7 days) and pages with a cursor', async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(tab('تاریخچه'));
    const chips = screen.getByRole('group', { name: 'بازه‌ی تاریخچه' });
    expect(within(chips).getByRole('button', { name: '۷ روز' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(tiles().length).toBeGreaterThan(0));
    const week = tiles().length;
    expect(week).toBeLessThan(10);

    // Seed times are relative to now: drop every finished order of today so «امروز» is empty.
    const today = localDate(Date.now());
    db.orders = db.orders.filter(
      (o) =>
        ['new', 'prep', 'ready', 'way'].includes(o.status!) || localDate(Date.parse(o.placedAt!)) !== today,
    );
    await user.click(within(chips).getByRole('button', { name: 'امروز' }));
    expect(await screen.findByText('در این بازه سفارشی نبود')).toBeInTheDocument();

    await user.click(within(chips).getByRole('button', { name: 'همه' }));
    await waitFor(() => expect(tiles()).toHaveLength(10));
    await user.click(screen.getByRole('button', { name: 'نمایش سفارش‌های قدیمی‌تر' }));
    const finished = db.orders.filter((o) => !['new', 'prep', 'ready', 'way'].includes(o.status!)).length;
    expect(finished).toBeGreaterThan(10);
    await waitFor(() => expect(tiles()).toHaveLength(finished));
    expect(screen.getByText('پایان فهرست')).toBeInTheDocument();
    expect(screen.getAllByText('لغو شد').length).toBeGreaterThan(0);
  });

  it('tab and range survive switching root tabs', async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(tab('در حال آماده‌سازی ۱'));
    await user.click(screen.getByRole('button', { name: 'منو' }));
    await user.click(screen.getByRole('button', { name: /^سفارش‌ها/ }));
    expect(tab('در حال آماده‌سازی ۱')).toHaveAttribute('aria-selected', 'true');
  });
});
