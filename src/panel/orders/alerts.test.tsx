import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import type { Order } from '../api/types';
import { addIncomingOrder, db } from '../mocks/db';
import { panelHandlers, resetPanelMockDb } from '../mocks/handlers';
import { usePanelNav } from '../nav/nav';
import { useLive } from '../realtime/live';
import { PanelShell } from '../shell/PanelShell';
import { setSoundEngine, type SoundEngine } from '../sound/engine';
import { useHistory } from '../state/history';
import { useOrders } from '../state/orders';
import { useOrdersUi } from '../state/ordersUi';
import { useRestaurant } from '../state/restaurant';
import { signedIn, signedOut, testStream } from '../test/session';
import { ANSWERED_ELSEWHERE, useAlerts } from './alerts';
import { AlertOverlay, prepPreview } from './OrderOverlays';
import { resetRejectReasons } from './reasons';

// KAN-64: new-order alert queue, sound, PrepSheet/ReasonSheet, answered elsewhere (D-96), 409, expiry.
let engine: Record<'startAlert' | 'stopAlert' | 'mute', ReturnType<typeof vi.fn>>;
beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  resetRejectReasons();
  localStorage.clear();
  useToast.setState({ toasts: [] });
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  useOrders.getState().reset();
  useOrdersUi.getState().reset();
  useHistory.getState().reset();
  usePanelNav.getState().resetTo('login');
  engine = { startAlert: vi.fn(), stopAlert: vi.fn(), mute: vi.fn() };
  setSoundEngine({
    ...engine,
    unlock: vi.fn(async () => true),
    applyLevel: vi.fn(),
  } as unknown as SoundEngine);
});
afterEach(() => {
  signedOut();
  setSoundEngine(null);
  vi.useRealTimers();
});

async function boot() {
  signedIn();
  render(<PanelShell />);
  await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' });
  await waitFor(() => expect(useLive.getState().status).toBe('open'));
  await waitFor(() => expect(useOrders.getState().status).toBe('ready'));
}
const alertBox = () => screen.queryByRole('alertdialog');
const toastText = () => useToast.getState().toasts[0]?.text;
function incoming(): Order {
  const o = addIncomingOrder();
  act(() => testStream.emit({ event: 'order.created', data: o }));
  return o;
}

describe('new order alert', () => {
  it('orders already waiting at shift start are not alerts; a live new order is, and rings', async () => {
    await boot();
    expect(alertBox()).toBeNull();
    expect(engine.startAlert).not.toHaveBeenCalled();
    incoming();
    const box = await screen.findByRole('alertdialog');
    expect(within(box).getByRole('heading', { name: 'سفارش جدید!' })).toBeInTheDocument();
    expect(within(box).getByText('#۱۲۴۹')).toBeInTheDocument();
    expect(within(box).getByText('بدون پیاز لطفاً')).toBeInTheDocument();
    expect(within(box).getByRole('timer')).toHaveAccessibleName(/[۰-۹]:[۰-۹]{2}/);
    expect(engine.startAlert).toHaveBeenCalledTimes(1);
  });

  it('mute silences only the sound; system back does not dismiss the alert', async () => {
    const user = userEvent.setup();
    await boot();
    incoming();
    await user.click(await screen.findByRole('button', { name: 'قطع صدا' }));
    expect(engine.mute).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'صدا قطع است' })).toHaveAttribute('aria-pressed', 'true');
    act(() => void usePanelNav.getState().handleSystemBack());
    expect(alertBox()).not.toBeNull();
  });

  it('queue: two orders, accept the first (PrepSheet), reject the second (ReasonSheet)', async () => {
    const user = userEvent.setup();
    await boot();
    const a = incoming();
    incoming();
    const box = await screen.findByRole('alertdialog');
    expect(within(box).getByText('#۱۲۴۹')).toBeInTheDocument();
    expect(within(box).getByText('۱ سفارش جدید دیگر در صف')).toBeInTheDocument();

    await user.click(within(box).getByRole('button', { name: 'پذیرش سفارش' }));
    // One overlay at a time: the sheet replaces the alert.
    expect(alertBox()).toBeNull();
    const sheet = screen.getByRole('dialog', { name: 'زمان آماده‌سازی' });
    expect(within(sheet).getByRole('button', { name: 'تأیید و پذیرش سفارش' })).toBeDisabled();
    await user.click(within(sheet).getByRole('button', { name: /^۲۰/ }));
    expect(within(sheet).getByText(prepPreview(20))).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'تأیید و پذیرش سفارش' }));

    await waitFor(() =>
      expect(within(screen.getByRole('alertdialog')).getByText('#۱۲۵۰')).toBeInTheDocument(),
    );
    expect(useOrders.getState().byId[a.id!]).toMatchObject({ status: 'prep', prepMinutes: 20 });
    expect(toastText()).toBe('سفارش پذیرفته شد');
    expect(engine.startAlert).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: 'رد سفارش' }));
    const reasons = await screen.findByRole('radiogroup', { name: 'دلیل رد سفارش' });
    await user.click(within(reasons).getByRole('radio', { name: 'رستوران شلوغ است' }));
    await user.click(screen.getByRole('button', { name: 'رد سفارش' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(toastText()).toBe('سفارش رد شد');
    expect(useAlerts.getState().queue).toEqual([]);
    expect(engine.stopAlert).toHaveBeenCalled();
  });

  it('closing the sheet returns to the alert (it still needs an answer)', async () => {
    const user = userEvent.setup();
    await boot();
    incoming();
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'پذیرش سفارش' }),
    );
    await user.click(screen.getByRole('button', { name: 'بستن' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('answered on another device: the alert closes with a toast (D-96)', async () => {
    await boot();
    const o = incoming();
    await screen.findByRole('alertdialog');
    act(() => testStream.emit({ event: 'order.updated', data: { ...o, status: 'prep', prepMinutes: 30 } }));
    await waitFor(() => expect(alertBox()).toBeNull());
    expect(toastText()).toBe(ANSWERED_ELSEWHERE);
  });

  it('409 when the other device was faster: server message, alert closes', async () => {
    const user = userEvent.setup();
    await boot();
    const o = incoming();
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'پذیرش سفارش' }),
    );
    await user.click(screen.getByRole('button', { name: /^۱۵/ }));
    // Accepted elsewhere; this device has not heard about it yet.
    db.orders.find((x) => x.id === o.id)!.status = 'prep';
    await user.click(screen.getByRole('button', { name: 'تأیید و پذیرش سفارش' }));
    await waitFor(() => expect(toastText()).toBe(ANSWERED_ELSEWHERE));
    await waitFor(() => expect(alertBox()).toBeNull());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('expired (no answer in time): toast and the alert closes', async () => {
    await boot();
    const o = incoming();
    await screen.findByRole('alertdialog');
    act(() => testStream.emit({ event: 'order.expired', data: { orderId: o.id! } }));
    await waitFor(() => expect(alertBox()).toBeNull());
    expect(toastText()).toBe('سفارش #۱۲۴۹ بی‌پاسخ ماند و لغو شد');
  });

  it('accept from the list card opens the PrepSheet; custom time stays within 5..120', async () => {
    const user = userEvent.setup();
    await boot();
    await user.click(screen.getAllByRole('button', { name: 'پذیرش سفارش' })[0]);
    const sheet = screen.getByRole('dialog', { name: 'زمان آماده‌سازی' });
    await user.click(within(sheet).getByRole('button', { name: /دلخواه/ }));
    expect(within(sheet).getByText('۴۵ دقیقه')).toBeInTheDocument();
    const plus = within(sheet).getByRole('button', { name: 'افزودن پنج دقیقه' });
    for (let i = 0; i < 20; i++) if (!(plus as HTMLButtonElement).disabled) await user.click(plus);
    expect(within(sheet).getByText('۱۲۰ دقیقه')).toBeInTheDocument();
    expect(plus).toBeDisabled();
    await user.click(within(sheet).getByRole('button', { name: 'تأیید و پذیرش سفارش' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(Object.values(useOrders.getState().byId).some((x) => x.prepMinutes === 120)).toBe(true);
  });
});

describe('alert timer', () => {
  it('counts down from acceptDeadline (fake timers)', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const now = Date.now();
    const o: Order = {
      id: 'z1',
      no: '1300',
      status: 'new',
      placedAt: new Date(now).toISOString(),
      acceptDeadline: new Date(now + 180_000).toISOString(),
      items: [{ qty: 1, name: 'کوبیده' }],
      foodsTotal: 100000,
      payment: 'online',
    };
    useOrders.setState({ byId: { z1: o } });
    useAlerts.setState({ queue: ['z1'], muted: false });
    render(<AlertOverlay />);
    expect(screen.getByRole('timer')).toHaveAccessibleName('زمان باقی‌مانده برای پاسخ ۳:۰۰');
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole('timer')).toHaveAccessibleName('زمان باقی‌مانده برای پاسخ ۲:۵۵');
    act(() => vi.advanceTimersByTime(200_000));
    expect(screen.getByRole('timer')).toHaveAccessibleName('زمان باقی‌مانده برای پاسخ ۰:۰۰');
  });
});
