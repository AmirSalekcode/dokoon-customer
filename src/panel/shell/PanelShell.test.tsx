import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { panelHandlers, resetPanelMockDb } from '../mocks/handlers';
import { usePanelNav } from '../nav/nav';
import { useRestaurant } from '../state/restaurant';
import { usePanelSession } from '../api/session';
import { signedIn } from '../test/session';
import { PanelShell } from './PanelShell';

// KAN-58: the restaurant app shell — header, navigation, open/closed switch, error pages.
beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  localStorage.clear();
  signedIn();
  useToast.setState({ toasts: [] });
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  usePanelNav.getState().resetTo('orders');
});

const visible = () => screen.getByRole('main', { hidden: false });
async function boot() {
  render(<PanelShell />);
  await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' });
}

describe('header and navigation', () => {
  it('shows the business header with name, rating and the open switch on a root tab', async () => {
    await boot();
    const header = screen.getByRole('banner');
    expect(within(header).getByText('رستوران')).toBeInTheDocument();
    expect(within(header).getByText(/امتیاز ۴٫۷/)).toBeInTheDocument();
    expect(within(header).getByRole('switch', { name: /باز/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('four tabs; picking one shows it and resets the stack', async () => {
    await boot();
    const tabs = screen.getByRole('navigation', { name: 'بخش‌های رستوران' });
    expect(
      within(tabs)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['سفارش‌ها', 'منو', 'گزارش', 'حساب']);
    await userEvent.click(within(tabs).getByRole('button', { name: 'حساب' }));
    expect(within(tabs).getByRole('button', { name: 'حساب' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(within(visible()).getByRole('button', { name: /راهنما و پشتیبانی/ }));
    expect(screen.queryByRole('navigation', { name: 'بخش‌های رستوران' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'بازگشت' }));
    expect(within(visible()).getByRole('button', { name: /راهنما و پشتیبانی/ })).toBeInTheDocument();
  });
});

describe('open / closed', () => {
  it('closing asks first, then saves, shows the closed banner and a warn toast', async () => {
    await boot();
    await userEvent.click(screen.getByRole('switch', { name: /باز/ }));
    const dlg = screen.getByRole('alertdialog', { name: 'رستوران بسته شود؟' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'بستن رستوران' }));
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false'));
    expect(screen.getByRole('status')).toHaveTextContent('رستوران بسته شد');
    expect(within(visible()).getByText(/رستوران بسته است/)).toBeInTheDocument();
  });

  it('cancel keeps it open', async () => {
    await boot();
    await userEvent.click(screen.getByRole('switch', { name: /باز/ }));
    await userEvent.click(screen.getByRole('button', { name: 'انصراف' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('opening is immediate (also from the banner)', async () => {
    await boot();
    await act(() => useRestaurant.getState().setOpen(undefined, false));
    await userEvent.click(within(visible()).getByRole('button', { name: 'باز کردن رستوران' }));
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(within(visible()).queryByText(/رستوران بسته است/)).toBeNull();
  });
});

describe('theme switch (D-60)', () => {
  it('account → «حالت تیره» switches the theme and stores the choice', async () => {
    await boot();
    await userEvent.click(screen.getByRole('button', { name: 'حساب' }));
    const sw = within(visible()).getByRole('switch', { name: 'حالت تیره' });
    await userEvent.click(sw);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('dk-theme')).toBe('dark');
    await userEvent.click(sw);
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});

describe('error pages (D-106)', () => {
  it('a failing request shows the full page; «بازگشت به خانه» goes to the orders tab', async () => {
    localStorage.setItem('dk-mock-status', '403');
    render(<PanelShell />);
    expect(await screen.findByRole('heading', { name: 'اجازه‌ی دسترسی ندارید' })).toBeInTheDocument();
    expect(screen.queryByRole('banner')).toBeNull();
    localStorage.removeItem('dk-mock-status');
    await userEvent.click(screen.getByRole('button', { name: 'بازگشت به خانه' }));
    expect(usePanelNav.getState().stack.map((r) => r.screen)).toEqual(['orders']);
  });

  it('«تماس با پشتیبانی» opens help', async () => {
    localStorage.setItem('dk-mock-status', '500');
    render(<PanelShell />);
    await screen.findByRole('heading', { name: 'مشکلی در سرور پیش آمده' });
    await userEvent.click(screen.getByRole('button', { name: 'تماس با پشتیبانی' }));
    expect(usePanelNav.getState().stack.at(-1)?.screen).toBe('help');
  });

  it('401 → «ورود دوباره» clears the restaurant session and opens login', async () => {
    usePanelSession.getState().setSession({ accessToken: 'a', refreshToken: 'r' });
    usePanelNav.getState().showError('e401');
    render(<PanelShell />);
    await userEvent.click(await screen.findByRole('button', { name: 'ورود دوباره' }));
    expect(usePanelSession.getState().accessToken).toBeNull();
    expect(usePanelNav.getState().stack.map((r) => r.screen)).toEqual(['login']);
  });

  it('maintenance from GET /app/config replaces everything at start', async () => {
    localStorage.setItem('dk-mock-config', JSON.stringify({ maintenance: true }));
    render(<PanelShell />);
    expect(await screen.findByRole('heading', { name: /در حال به‌روزرسانی/ })).toBeInTheDocument();
    expect(usePanelNav.getState().stack.map((r) => r.screen)).toEqual(['error']);
  });

  it('offline text speaks about receiving orders', async () => {
    usePanelNav.getState().showError('offline');
    render(<PanelShell />);
    expect(await screen.findByText(/برای دریافت سفارش‌ها/)).toBeInTheDocument();
  });
});
