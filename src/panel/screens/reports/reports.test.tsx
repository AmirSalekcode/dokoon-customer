import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { panelHandlers, resetPanelMockDb } from '../../mocks/handlers';
import { usePanelNav } from '../../nav/nav';
import { PanelShell } from '../../shell/PanelShell';
import { useOrders } from '../../state/orders';
import { useReports } from '../../state/reports';
import { useRestaurant } from '../../state/restaurant';
import { signedIn, signedOut } from '../../test/session';

// KAN-68: reports tab (periods, stats, chart, best sellers, settlements) and settlement detail.
beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  localStorage.clear();
  useToast.setState({ toasts: [] });
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  useOrders.getState().reset();
  useReports.getState().reset();
  usePanelNav.getState().resetTo('login');
});
afterEach(() => signedOut());

const route = () => usePanelNav.getState().stack.at(-1)!;

async function openReports() {
  signedIn();
  render(<PanelShell />);
  await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' });
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'گزارش' }));
  await screen.findByText('۴٬۸۵۰٬۰۰۰ تومان');
  return user;
}

describe('reports tab', () => {
  it('today: four stats with comparisons, chart and best sellers', async () => {
    await openReports();
    expect(screen.getByRole('tab', { name: 'امروز' })).toHaveAttribute('aria-selected', 'true');
    const card = (label: string) => screen.getByText(label).parentElement!.parentElement!;
    expect(card('تعداد سفارش')).toHaveTextContent('۱۷');
    expect(screen.getByText('۲۸۵٬۰۰۰ تومان')).toBeInTheDocument();
    expect(screen.getByText('۲۲ دقیقه')).toBeInTheDocument();
    expect(screen.getByText('۱۲٪ بیشتر از دیروز')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /سفارش‌ها در ساعت‌های امروز/ })).toBeInTheDocument();
    expect(screen.getByText('۱. چلوکباب کوبیده')).toBeInTheDocument();
  });

  it('switching the period loads that report', async () => {
    const user = await openReports();
    await user.click(screen.getByRole('tab', { name: 'این ماه' }));
    expect(await screen.findByText('۱۲۸٬۴۰۰٬۰۰۰ تومان')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /سفارش‌ها در هفته‌های این ماه/ })).toBeInTheDocument();
    expect(screen.queryByText('۴٬۸۵۰٬۰۰۰ تومان')).not.toBeInTheDocument();
  });

  it('a report error is inline with retry', async () => {
    server.use(
      http.get('*/v1/r/reports', () => HttpResponse.json({ code: 'X', message: 'x' }, { status: 429 })),
    );
    signedIn();
    render(<PanelShell />);
    await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'گزارش' }));
    expect(await screen.findByText('گزارش دریافت نشد.')).toBeInTheDocument();
    server.use(...panelHandlers);
    await user.click(screen.getByRole('button', { name: 'تلاش دوباره' }));
    expect(await screen.findByText('۴٬۸۵۰٬۰۰۰ تومان')).toBeInTheDocument();
  });
});

describe('settlements', () => {
  it('lists settlements and opens the detail with server numbers; back returns', async () => {
    const user = await openReports();
    const row = await screen.findByRole('button', { name: /هفته‌ی ۴ آبان/ });
    expect(row).toHaveTextContent('واریز شد');
    await user.click(row);
    expect(route()).toMatchObject({ screen: 'settle', params: { id: 's2' } });
    await screen.findByRole('heading', { name: 'واریز شد' });
    const list = screen.getByText('مبلغ قابل واریز').closest('dl')!;
    expect(within(list).getByText('کمیسیون دکون (۱۲٪)')).toBeInTheDocument();
    expect(within(list).getByText('− ۴٬۶۸۰٬۰۰۰ تومان')).toBeInTheDocument();
    expect(within(list).getByText('۳۴٬۳۲۰٬۰۰۰ تومان')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'بازگشت' }));
    expect(route().screen).toBe('reports');
  });

  it('downloads the statement as PDF and as Excel (KAN-75)', async () => {
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const user = await openReports();
    await user.click(await screen.findByRole('button', { name: /هفته‌ی ۴ آبان/ }));
    await user.click(await screen.findByRole('button', { name: 'دریافت صورت‌حساب PDF' }));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect((create.mock.calls[0] as unknown as [Blob])[0].type).toBe('application/pdf');
    expect(useToast.getState().toasts[0]?.text).toBe('صورت‌حساب دانلود شد');

    await user.click(screen.getByRole('button', { name: 'دریافت صورت‌حساب اکسل' }));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(2));
    expect((create.mock.calls[1] as unknown as [Blob])[0].type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    click.mockRestore();
  });

  it('exports every settlement to one Excel file from the reports tab', async () => {
    const create = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const user = await openReports();
    await user.click(await screen.findByRole('button', { name: 'دریافت اکسل همه‌ی تسویه‌ها' }));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect((create.mock.calls[0] as unknown as [Blob])[0].type).toContain('spreadsheetml');
    expect(useToast.getState().toasts[0]?.text).toBe('صورت‌حساب دانلود شد');
    click.mockRestore();
  });
});
