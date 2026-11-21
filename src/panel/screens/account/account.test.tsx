import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { db } from '../../mocks/db';
import { panelHandlers, resetPanelMockDb } from '../../mocks/handlers';
import { usePanelNav } from '../../nav/nav';
import { PanelShell } from '../../shell/PanelShell';
import { useHours } from '../../state/hours';
import { useOrders } from '../../state/orders';
import { useRestaurant } from '../../state/restaurant';
import { useSettings } from '../../state/settings';
import { signedIn, signedOut } from '../../test/session';

// KAN-69: account tab, weekly hours, delivery & payment settings.
beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  localStorage.clear();
  useToast.setState({ toasts: [] });
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  useOrders.getState().reset();
  useHours.getState().reset();
  useSettings.getState().reset();
  usePanelNav.getState().resetTo('login');
});
afterEach(() => signedOut());

const route = () => usePanelNav.getState().stack.at(-1)!;
const toastText = () => useToast.getState().toasts[0]?.text;

async function openAccount() {
  signedIn();
  render(<PanelShell />);
  await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' });
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'حساب' }));
  await screen.findByRole('heading', { level: 2, name: 'کبابی سنتی زاگرس' });
  return user;
}

describe('account tab', () => {
  it('restaurant card, rows, dark mode, version and sign-out confirmation', async () => {
    const user = await openAccount();
    expect(screen.getByText(/مهدی رضایی/)).toHaveTextContent('۰۹۱۳•••۴۵۶۷');
    for (const t of ['ساعت کاری', 'تنظیمات تحویل و پرداخت', 'صدا و هشدار', 'راهنما و پشتیبانی'])
      expect(screen.getByRole('button', { name: new RegExp(t) })).toBeInTheDocument();
    expect(screen.getByText(/^نسخه‌ی /)).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'حالت تیره' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    await user.click(screen.getByRole('button', { name: 'خروج از حساب' }));
    expect(screen.getByRole('alertdialog', { name: 'از حساب خارج می‌شوید؟' })).toBeInTheDocument();
  });
});

describe('hours', () => {
  it('opens Friday until 01:30, saves, and returns to the account', async () => {
    const user = await openAccount();
    await user.click(screen.getByRole('button', { name: /ساعت کاری/ }));
    await screen.findByRole('switch', { name: 'باز بودن در جمعه' });
    const save = screen.getByRole('button', { name: 'ذخیره‌ی ساعت کاری' });
    expect(save).toBeDisabled();
    await user.click(screen.getByRole('switch', { name: 'باز بودن در جمعه' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'ساعت پایان جمعه' }), '01:30');
    await user.click(save);
    await waitFor(() => expect(route().screen).toBe('account'));
    expect(db.hours.find((d) => d.day === 6)).toMatchObject({ on: true, from: '12:00', to: '01:30' });
    expect(toastText()).toBe('ساعت کاری ذخیره شد');
  });

  it('a closing time before the opening time blocks saving with an error', async () => {
    const user = await openAccount();
    await user.click(screen.getByRole('button', { name: /ساعت کاری/ }));
    const to = await screen.findByRole('combobox', { name: 'ساعت پایان شنبه' });
    await user.selectOptions(to, '10:00');
    expect(screen.getByRole('alert')).toHaveTextContent('ساعت پایان باید بعد از ساعت شروع باشد');
    expect(screen.getByRole('button', { name: 'ذخیره‌ی ساعت کاری' })).toBeDisabled();
    // Back discards the edit.
    await user.click(screen.getByRole('button', { name: 'بازگشت' }));
    expect(route().screen).toBe('account');
    expect(db.hours.find((d) => d.day === 0)?.to).not.toBe('10:00');
  });
});

describe('delivery & payment', () => {
  it('toggles cash/extras, keeps max ≥ min, saves', async () => {
    const user = await openAccount();
    await user.click(screen.getByRole('button', { name: /تنظیمات تحویل و پرداخت/ }));
    await screen.findByRole('switch', { name: 'پرداخت نقدی هنگام تحویل' });
    await user.click(screen.getByRole('switch', { name: 'پرداخت نقدی هنگام تحویل' }));
    await user.click(screen.getByRole('switch', { name: 'افزودنی و گزینه‌ها' }));
    // min 30 → 50 pushes max 45 → 50.
    for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'افزایش حداقل زمان' }));
    expect(within(screen.getByText('حداقل زمان').parentElement!).getByText('۵۰ دقیقه')).toBeInTheDocument();
    expect(within(screen.getByText('حداکثر زمان').parentElement!).getByText('۵۰ دقیقه')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ذخیره‌ی تنظیمات' }));
    await waitFor(() => expect(route().screen).toBe('account'));
    expect(db.settings).toMatchObject({ allowCash: false, allowExtras: false, etaMin: 50, etaMax: 50 });
  });

  it('the minimum stops at 5', async () => {
    const user = await openAccount();
    await user.click(screen.getByRole('button', { name: /تنظیمات تحویل و پرداخت/ }));
    const down = await screen.findByRole('button', { name: 'کاهش حداقل زمان' });
    for (let i = 0; i < 6; i++) await user.click(down);
    expect(down).toBeDisabled();
    expect(within(screen.getByText('حداقل زمان').parentElement!).getByText('۵ دقیقه')).toBeInTheDocument();
  });
});
