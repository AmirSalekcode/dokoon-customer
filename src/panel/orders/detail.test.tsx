import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { db } from '../mocks/db';
import { panelHandlers, resetPanelMockDb } from '../mocks/handlers';
import { usePanelNav } from '../nav/nav';
import { useLive } from '../realtime/live';
import { PanelShell } from '../shell/PanelShell';
import { setSoundEngine, type SoundEngine } from '../sound/engine';
import { useHistory } from '../state/history';
import { useOrders } from '../state/orders';
import { useOrdersUi } from '../state/ordersUi';
import { useRestaurant } from '../state/restaurant';
import { signedIn, signedOut } from '../test/session';
import { PRINT_KEY, usePrint } from './print';
import { resetRejectReasons } from './reasons';

// KAN-65: order detail — steps new → prep → ready → way, +5 min, cancel, 409, masked customer, receipt.
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
  usePrint.setState({ order: null, paper: '80mm' });
  usePanelNav.getState().resetTo('login');
  setSoundEngine({
    startAlert: vi.fn(),
    stopAlert: vi.fn(),
    mute: vi.fn(),
    unlock: vi.fn(async () => true),
    applyLevel: vi.fn(),
  } as unknown as SoundEngine);
});
afterEach(() => {
  signedOut();
  setSoundEngine(null);
  vi.restoreAllMocks();
});

async function boot() {
  signedIn();
  render(<PanelShell />);
  await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' });
  await waitFor(() => expect(useLive.getState().status).toBe('open'));
  await waitFor(() => expect(useOrders.getState().status).toBe('ready'));
}
const top = () => usePanelNav.getState().stack.at(-1)!;
const detail = () => screen.getByTestId('order-detail');
const toastText = () => useToast.getState().toasts[0]?.text;

async function openFirst(user: ReturnType<typeof userEvent.setup>, tabName: string) {
  await user.click(screen.getByRole('tab', { name: tabName }));
  await user.click(screen.getAllByRole('button', { name: /^جزئیات سفارش/ })[0]);
  await waitFor(() => expect(top().screen).toBe('order'));
  return detail();
}

describe('order detail', () => {
  it('phone: the card opens the order screen; masked customer, no call buttons; back returns exactly', async () => {
    const user = userEvent.setup();
    await boot();
    const d = await openFirst(user, 'جدید ۲');
    expect(screen.getByRole('heading', { level: 1, name: 'جزئیات سفارش' })).toBeInTheDocument();
    expect(within(d).getByText(/•••/)).toBeInTheDocument();
    expect(within(d).queryByRole('button', { name: /تماس/ })).toBeNull();
    expect(within(d).getByRole('button', { name: 'پذیرش سفارش' })).toBeInTheDocument();
    expect(within(d).getByRole('button', { name: 'رد سفارش' })).toBeInTheDocument();
    act(() => void usePanelNav.getState().handleSystemBack());
    expect(top().screen).toBe('orders');
    expect(screen.getByRole('tab', { name: 'جدید ۲' })).toHaveAttribute('aria-selected', 'true');
  });

  it('full cycle from the detail: new → prep (+5) → ready → way', async () => {
    const user = userEvent.setup();
    await boot();
    const d = await openFirst(user, 'جدید ۲');
    const id = top().params.id;

    await user.click(within(d).getByRole('button', { name: 'پذیرش سفارش' }));
    const sheet = screen.getByRole('dialog', { name: 'زمان آماده‌سازی' });
    await user.click(within(sheet).getByRole('button', { name: /^۲۰/ }));
    await user.click(within(sheet).getByRole('button', { name: 'تأیید و پذیرش سفارش' }));
    await waitFor(() => expect(within(d).getByText('زمان آماده‌سازی: ۲۰ دقیقه')).toBeInTheDocument());

    await user.click(within(d).getByRole('button', { name: 'افزودن ۵ دقیقه به زمان آماده‌سازی' }));
    await waitFor(() => expect(within(d).getByText('زمان آماده‌سازی: ۲۵ دقیقه')).toBeInTheDocument());
    expect(toastText()).toBe('۵ دقیقه به زمان آماده‌سازی اضافه شد');

    await user.click(within(d).getByRole('button', { name: 'سفارش آماده است' }));
    await waitFor(() => expect(within(d).getByText('آماده تحویل به پیک')).toBeInTheDocument());
    expect(within(d).getByText('حسین جعفری')).toBeInTheDocument();

    await user.click(within(d).getByRole('button', { name: 'تحویل به پیک شد' }));
    await waitFor(() =>
      expect(within(d).getByText('در مسیر مشتری', { selector: 'span' })).toBeInTheDocument(),
    );
    expect(within(d).queryByRole('button', { name: 'تحویل به پیک شد' })).toBeNull();
    expect(within(d).queryByRole('button', { name: 'رد سفارش' })).toBeNull();
    expect(useOrders.getState().byId[id].status).toBe('way');
  });

  it('409 on an invalid step: the server message and the detail shows the real state', async () => {
    const user = userEvent.setup();
    await boot();
    const d = await openFirst(user, 'آماده / در مسیر ۲');
    // Already handed over on another device.
    db.orders.find((o) => o.id === top().params.id)!.status = 'way';
    await user.click(within(d).getByRole('button', { name: 'تحویل به پیک شد' }));
    await waitFor(() => expect(toastText()).toBe('وضعیت این سفارش تغییر کرده است؛ صفحه را تازه کنید'));
    await waitFor(() =>
      expect(within(d).getByText('در مسیر مشتری', { selector: 'span' })).toBeInTheDocument(),
    );
  });

  it('cancel while preparing: «لغو» reasons, the detail keeps showing the cancelled order', async () => {
    const user = userEvent.setup();
    await boot();
    const d = await openFirst(user, 'در حال آماده‌سازی ۱');
    await user.click(within(d).getByRole('button', { name: 'لغو سفارش' }));
    const reasons = await screen.findByRole('radiogroup', { name: 'دلیل لغو سفارش' });
    await user.click(within(reasons).getByRole('radio', { name: 'مواد اولیه تمام شده' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'لغو سفارش' }));
    await waitFor(() => expect(within(detail()).getByText('لغو شد')).toBeInTheDocument());
    expect(within(detail()).getByText('دلیل: مواد اولیه تمام شده')).toBeInTheDocument();
    expect(toastText()).toBe('سفارش لغو شد');
    expect(Object.values(useOrders.getState().byId).some((o) => o.status === 'prep')).toBe(false);
  });

  it('an order not in memory (history after reload) is fetched by id', async () => {
    await boot();
    act(() => usePanelNav.getState().push('order', { id: 'h3' }));
    expect(await screen.findByText('تحویل شد')).toBeInTheDocument();
    act(() => usePanelNav.getState().push('order', { id: 'nope' }));
    expect(await screen.findByText('سفارش پیدا نشد')).toBeInTheDocument();
  });

  it('receipt: prints the order after it rendered; paper size is kept per device', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await boot();
    const d = await openFirst(user, 'جدید ۲');
    await user.click(within(d).getByRole('button', { name: 'آ۴' }));
    expect(localStorage.getItem(PRINT_KEY)).toBe('a4');
    await user.click(within(d).getByRole('button', { name: 'چاپ رسید' }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    const receipt = screen.getByTestId('receipt');
    expect(receipt.className).toMatch(/a4/);
    expect(within(receipt).getByText('کبابی سنتی زاگرس')).toBeInTheDocument();
    expect(within(receipt).getByText(`سفارش ${within(d).getByText(/^#/).textContent}`)).toBeInTheDocument();
  });
});
