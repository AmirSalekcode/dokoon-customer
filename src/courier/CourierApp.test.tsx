import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { EXIT_TOAST } from '@/nav/createStackNav';
import { toast, useToast } from '@/ui/toast';
import { useTheme } from '@/theme/theme';
import { CourierApp } from './CourierApp';
import { useCourierSession } from './api/session';
import { courierHandlers } from './mocks/handlers';
import { useCourierNav } from './nav/nav';
import { registerOverlay } from './shell/overlays';
import { signedInCourier } from './test/session';

// KAN-89: courier shell — tabs (bar/rail), stack with exact back (Android/browser), one overlay at a time,
// toasts, global offline page, theme switch.
const nav = () => useCourierNav.getState();
const tabsNav = () => screen.getByRole('navigation', { name: 'بخش‌های پیک' });
const tab = (name: string) => within(tabsNav()).getByRole('button', { name });
/** Android/browser back; returns what the nav did. */
const sysBack = () => {
  let r = '';
  act(() => {
    r = nav().handleSystemBack();
  });
  return r;
};
/** The visible screen (lower stack screens stay mounted but hidden). */
const topScreen = () => document.querySelector<HTMLElement>('main:not([hidden])')!;

beforeEach(() => {
  // The earnings tab loads its numbers (KAN-98): an approved courier on the mock.
  server.use(...courierHandlers);
  signedInCourier(undefined, '');
  act(() => {
    nav().resetTo('orders');
    useCourierNav.setState({ overlay: null, exitArmedAt: 0 });
  });
  useToast.setState({ toasts: [] });
});
afterEach(() => {
  vi.restoreAllMocks();
  useTheme.getState().setMode('system');
});

describe('tabs', () => {
  it('starts on orders with the orange header and three tabs; the active one is the current page', () => {
    render(<CourierApp />);
    expect(screen.getByRole('banner')).toHaveTextContent('پیک');
    expect(screen.getByRole('heading', { level: 1, name: 'دکون پیک' })).toBeInTheDocument();
    const buttons = within(tabsNav()).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['سفارش‌ها', 'درآمد', 'حساب']);
    expect(tab('سفارش‌ها')).toHaveAttribute('aria-current', 'page');
    expect(topScreen()).toHaveAttribute('data-screen', 'orders');
  });

  it('switching a tab resets the stack and shows that tab (the header is on orders only)', async () => {
    render(<CourierApp />);
    await userEvent.click(tab('درآمد'));
    expect(nav().stack.map((r) => r.screen)).toEqual(['earn']);
    expect(topScreen()).toHaveAttribute('data-screen', 'earn');
    expect(tab('درآمد')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('heading', { level: 1, name: 'دکون پیک' })).toBeNull();
    await userEvent.click(tab('حساب'));
    expect(screen.getByRole('heading', { name: 'حساب' })).toBeInTheDocument();
  });
});

describe('system back (Android / browser)', () => {
  it('on a non-home tab goes to orders first; on orders the first press warns, the second exits', () => {
    render(<CourierApp />);
    act(() => nav().resetTo('account'));
    expect(sysBack()).toBe('popped');
    expect(topScreen()).toHaveAttribute('data-screen', 'orders');
    expect(sysBack()).toBe('exit-armed');
    expect(useToast.getState().toasts.map((t) => t.text)).toContain(EXIT_TOAST);
    expect(sysBack()).toBe('exit');
  });

  it('an error page returns to the exact screen below it, which stayed mounted', () => {
    render(<CourierApp />);
    act(() => nav().resetTo('account'));
    const account = topScreen();
    act(() => nav().showError('e500'));
    expect(topScreen()).toHaveAttribute('data-screen', 'error');
    // The account screen is still in the DOM (hidden + inert), so its state and scroll survive.
    expect(account).toHaveAttribute('hidden');
    expect(account).toHaveAttribute('inert');
    // No tab bar on a pushed screen.
    expect(screen.queryByRole('navigation', { name: 'بخش‌های پیک' })).toBeNull();
    sysBack();
    expect(topScreen()).toBe(account);
  });
});

describe('global offline page', () => {
  it('losing the network shows the courier offline page; coming back returns to the same screen', () => {
    render(<CourierApp />);
    act(() => nav().resetTo('earn'));
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(topScreen()).toHaveAttribute('data-screen', 'error');
    expect(screen.getByText('برای دریافت سفارش‌ها باید به اینترنت وصل باشید. اتصال را بررسی کنید.')).toBeVisible();
    act(() => void window.dispatchEvent(new Event('offline'))); // not stacked twice
    expect(nav().stack.filter((r) => r.screen === 'error')).toHaveLength(1);
    act(() => void window.dispatchEvent(new Event('online')));
    expect(topScreen()).toHaveAttribute('data-screen', 'earn');
  });

  it('error actions: «تلاش دوباره» goes back, a 5xx «تماس با پشتیبانی» opens the account tab', async () => {
    render(<CourierApp />);
    act(() => nav().resetTo('earn'));
    act(() => nav().showError('e500'));
    await userEvent.click(screen.getByRole('button', { name: 'تماس با پشتیبانی' }));
    expect(nav().stack.map((r) => r.screen)).toEqual(['account']);
    act(() => nav().showError('e503'));
    await userEvent.click(screen.getByRole('button', { name: 'تلاش دوباره' }));
    expect(nav().stack.map((r) => r.screen)).toEqual(['account']);
  });
});

describe('overlays (one at a time)', () => {
  it('sign-out asks in a dialog; back closes it without leaving the tab; confirming ends the session', async () => {
    const clear = vi.spyOn(useCourierSession.getState(), 'clear');
    render(<CourierApp />);
    act(() => nav().resetTo('account'));
    await userEvent.click(screen.getByRole('button', { name: 'خروج از حساب' }));
    expect(screen.getByRole('alertdialog', { name: 'از حساب خارج می‌شوید؟' })).toBeInTheDocument();
    expect(sysBack()).toBe('overlay');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(topScreen()).toHaveAttribute('data-screen', 'account');

    await userEvent.click(screen.getByRole('button', { name: 'خروج از حساب' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'خروج' }));
    expect(clear).toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(nav().stack.map((r) => r.screen)).toEqual(['login']);
  });

  it('a reason sheet needs a pick before confirming and hands the picked id over', async () => {
    const onConfirm = vi.fn();
    render(<CourierApp />);
    act(() =>
      nav().openOverlay({
        kind: 'sheet',
        props: {
          title: 'دلیل انصراف',
          text: 'متن',
          reasons: [
            { id: 'bike', label: 'موتورم خراب شد' },
            { id: 'road', label: 'مسیر بسته است' },
          ],
          confirmLabel: 'انصراف از سفارش',
          onConfirm,
        },
      }),
    );
    const confirm = screen.getByRole('button', { name: 'انصراف از سفارش' });
    expect(confirm).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: 'مسیر بسته است' }));
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('road');
  });

  it('opening another overlay replaces the first; a registered view renders its kind', () => {
    render(<CourierApp />);
    // After mount: the shell registers the real offer alert (KAN-95); this stands in for it.
    registerOverlay('alr', ({ props }) => <section role="alertdialog" aria-label={String(props.label)} />);
    act(() => nav().openOverlay({ kind: 'dlg', props: { title: 'الف', confirmLabel: 'باشه', onConfirm: () => {} } }));
    act(() => nav().openOverlay({ kind: 'alr', props: { label: 'پیشنهاد تازه' } }));
    expect(screen.queryByRole('alertdialog', { name: 'الف' })).toBeNull();
    expect(screen.getByRole('alertdialog', { name: 'پیشنهاد تازه' })).toBeInTheDocument();
    registerOverlay('alr', null);
  });

  it('toasts show beside an open overlay without closing it', () => {
    render(<CourierApp />);
    act(() => nav().openOverlay({ kind: 'dlg', props: { title: 'الف', confirmLabel: 'باشه', onConfirm: () => {} } }));
    act(() => toast('ذخیره شد'));
    expect(screen.getByText('ذخیره شد')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog', { name: 'الف' })).toBeInTheDocument();
  });
});

describe('theme', () => {
  it('the account switch turns dark mode on and off and stores the choice in dk-theme', async () => {
    render(<CourierApp />);
    act(() => nav().resetTo('account'));
    const sw = screen.getByRole('switch', { name: /حالت تیره/ });
    await userEvent.click(sw);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('dk-theme')).toBe('dark');
    await userEvent.click(sw);
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(localStorage.getItem('dk-theme')).toBe('light');
  });
});
