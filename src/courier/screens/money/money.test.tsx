import { act, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { CourierApp } from '../../CourierApp';
import { useCourierSession } from '../../api/session';
import type { HistoryItem, Settlement } from '../../api/types';
import { courierHandlers, resetCourierMockDb } from '../../mocks/handlers';
import { useEarnings } from '../../money/earnings';
import { useMoneyLists } from '../../money/history';
import { historyRow, historyRows, settlementRow } from '../../money/historyPresent';
import { useCourierNav } from '../../nav/nav';
import { signedInCourier } from '../../test/session';

// KAN-99 (CP-15): trip history (cursor pages, infinite scroll + button), trip details with exact back,
// settlements; entries from the earnings and account tabs.
const nav = () => useCourierNav.getState();
const screens = () => nav().stack.map((r) => r.screen);
const top = () => document.querySelector<HTMLElement>('main:not([hidden])')!;
const url = (path: string) => new RegExp(`${path.replace(/\//g, '\\/')}(\\?|$)`);
const rows = () => within(within(top()).getByRole('list', { name: 'سفارش‌های تحویل‌شده' })).getAllByRole('listitem');

const NOW = Date.parse('2026-11-24T12:00:00+03:30');
const trip = (over: Partial<HistoryItem> = {}): HistoryItem => ({
  id: 'h1',
  no: 4820,
  rest: 'پیتزا ماهان',
  toArea: 'شهرضا، خیابان ارم',
  deliveredAt: '2026-11-24T10:05:00+03:30',
  km: 2.4,
  earn: 52_000,
  cash: true,
  cashCollected: 199_000,
  ...over,
});

beforeEach(() => {
  server.use(...courierHandlers);
  resetCourierMockDb();
  localStorage.clear();
  useToast.setState({ toasts: [] });
  useEarnings.getState().reset();
  useMoneyLists.getState().reset();
  signedInCourier();
  act(() => nav().resetTo('earn'));
});
afterEach(() => {
  vi.restoreAllMocks();
  useCourierSession.getState().clear();
});

describe('present', () => {
  it('history row: restaurant ← area, today/yesterday/date, Tehran time, km, server earn', () => {
    expect(historyRow(trip(), NOW)).toEqual({
      title: 'پیتزا ماهان ← شهرضا، خیابان ارم',
      sub: 'امروز · ۱۰:۰۵ · ۲٫۴ کیلومتر',
      earn: '۵۲٬۰۰۰ تومان',
      pay: 'نقدی',
    });
    expect(historyRow(trip({ deliveredAt: '2026-11-23T23:30:00+03:30', cash: false }), NOW).sub).toMatch(/^دیروز · ۲۳:۳۰/);
    expect(historyRow(trip({ deliveredAt: '2026-11-03T09:00:00+03:30' }), NOW).sub).toMatch(/^۱۲ آبان · /);
  });

  it('details list the cash the courier entered, as sent (no comparison with the order)', () => {
    const r = historyRows(trip(), NOW);
    expect(r.at(-1)).toEqual({ label: 'نقد دریافتی از مشتری', value: '۱۹۹٬۰۰۰ تومان' });
    expect(historyRows(trip({ cash: false, cashCollected: undefined }), NOW).map((x) => x.label)).not.toContain(
      'نقد دریافتی از مشتری',
    );
  });

  it('settlement row: Persian period, paid date or pending dot, masked Sheba, server amount', () => {
    const paid: Settlement = {
      id: 's1',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-07',
      amount: 1_890_000,
      status: 'paid',
      paidAt: '2026-11-09T10:00:00+03:30',
      shebaMasked: '••••4210',
    };
    const r = settlementRow(paid);
    expect(r.title).toBe('۱۰ آبان تا ۱۶ آبان ۱۴۰۵');
    expect(r.sub).toContain('واریز شد · ۱۸ آبان ۱۴۰۵');
    expect(r.sub).toContain('••••۴۲۱۰');
    expect(r.meta).toBe('۱٬۸۹۰٬۰۰۰ تومان');
    expect(r.dot).toBe(false);
    expect(settlementRow({ ...paid, status: 'pending', paidAt: undefined })).toMatchObject({ dot: true });
  });
});

describe('history', () => {
  it('earnings → history: first page, the button loads older trips, then the end of the list', async () => {
    render(<CourierApp />);
    await userEvent.click(within(top()).getByRole('button', { name: /تاریخچه‌ی سفارش‌ها/ }));
    expect(screens()).toEqual(['earn', 'hist']);
    await waitFor(() => expect(rows()).toHaveLength(20));
    await userEvent.click(within(top()).getByRole('button', { name: 'نمایش سفارش‌های قدیمی‌تر' }));
    await waitFor(() => expect(rows()).toHaveLength(40));
    await userEvent.click(within(top()).getByRole('button', { name: 'نمایش سفارش‌های قدیمی‌تر' }));
    await waitFor(() => expect(rows()).toHaveLength(45));
    expect(within(top()).getByText('پایان فهرست')).toBeInTheDocument();
  });

  it('a row opens its details; back returns to the same list, then to earnings', async () => {
    render(<CourierApp />);
    await userEvent.click(within(top()).getByRole('button', { name: /تاریخچه‌ی سفارش‌ها/ }));
    await waitFor(() => expect(rows()).toHaveLength(20));
    await userEvent.click(within(rows()[1]).getByRole('button'));
    expect(screens()).toEqual(['earn', 'hist', 'histd']);
    expect(within(top()).getByRole('heading', { name: 'سفارش ۴۸۱۹' })).toBeInTheDocument();
    expect(within(top()).getByText('نحوه‌ی پرداخت')).toBeInTheDocument();
    await userEvent.click(within(top()).getByRole('button', { name: 'بازگشت' }));
    expect(screens()).toEqual(['earn', 'hist']);
    expect(rows()).toHaveLength(20);
    act(() => void nav().handleSystemBack());
    expect(screens()).toEqual(['earn']);
  });

  it('account → history', async () => {
    act(() => nav().resetTo('account'));
    render(<CourierApp />);
    await userEvent.click(within(top()).getByRole('button', { name: /تاریخچه‌ی سفارش‌ها/ }));
    expect(screens()).toEqual(['account', 'hist']);
    await waitFor(() => expect(rows()).toHaveLength(20));
  });

  it('empty history', async () => {
    server.use(http.get(url('/c/orders/history'), () => HttpResponse.json({ items: [] })));
    act(() => nav().push('hist'));
    render(<CourierApp />);
    expect(await within(top()).findByText('هنوز سفارشی تحویل نداده‌اید')).toBeInTheDocument();
  });

  it('an older page that fails keeps the rows and offers a retry', async () => {
    act(() => nav().push('hist'));
    render(<CourierApp />);
    await waitFor(() => expect(rows()).toHaveLength(20));
    server.use(
      http.get(url('/c/orders/history'), ({ request }) =>
        new URL(request.url).searchParams.get('cursor')
          ? HttpResponse.json({ code: 'X', message: 'x' }, { status: 400 })
          : undefined,
      ),
    );
    await userEvent.click(within(top()).getByRole('button', { name: 'نمایش سفارش‌های قدیمی‌تر' }));
    expect(await within(top()).findByText('ادامه‌ی فهرست نیامد')).toBeInTheDocument();
    expect(rows()).toHaveLength(20);
    server.resetHandlers();
    server.use(...courierHandlers);
    await userEvent.click(within(top()).getByRole('button', { name: 'تلاش دوباره' }));
    await waitFor(() => expect(rows()).toHaveLength(40));
  });

  it('details of a trip that is not loaded say so', () => {
    act(() => nav().push('histd', { id: 'nope' }));
    render(<CourierApp />);
    expect(within(top()).getByText('این سفارش پیدا نشد')).toBeInTheDocument();
  });
});

describe('settlements', () => {
  it('earnings → settlements: newest first, the pending one marked', async () => {
    render(<CourierApp />);
    await userEvent.click(within(top()).getByRole('button', { name: /تسویه‌حساب‌ها/ }));
    expect(screens()).toEqual(['earn', 'settle']);
    expect(await within(top()).findByText('۱٬۳۲۰٬۰۰۰ تومان')).toBeInTheDocument();
    expect(within(top()).getByText(/در انتظار واریز/)).toBeInTheDocument();
    expect(within(top()).getAllByText(/واریز شد/)).toHaveLength(2);
    expect(within(top()).getByText('۲٬۱۴۰٬۰۰۰ تومان')).toBeInTheDocument();
  });

  it('a payout opens its details (period, status, amount, masked Sheba, paid date); back is exact', async () => {
    act(() => nav().push('settle'));
    render(<CourierApp />);
    await within(top()).findByText('۲٬۱۴۰٬۰۰۰ تومان');
    await userEvent.click(within(top()).getByRole('button', { name: /۲٬۱۴۰٬۰۰۰ تومان/ }));
    expect(screens()).toEqual(['earn', 'settle', 'setd']);
    expect(within(top()).getByRole('heading', { name: 'جزئیات تسویه' })).toBeInTheDocument();
    expect(within(top()).getByText('واریز شد')).toBeInTheDocument();
    expect(within(top()).getByText('تاریخ واریز')).toBeInTheDocument();
    expect(top()).toHaveTextContent('••••۴۲۱۰');
    act(() => void nav().handleSystemBack());
    expect(screens()).toEqual(['earn', 'settle']);
  });

  it('empty and full-page error states', async () => {
    server.use(http.get(url('/c/settlements'), () => HttpResponse.json([])));
    act(() => nav().push('settle'));
    const { unmount } = render(<CourierApp />);
    expect(await within(top()).findByText('هنوز تسویه‌ای نیست')).toBeInTheDocument();
    unmount();
    useMoneyLists.getState().reset();
    server.use(http.get(url('/c/settlements'), () => HttpResponse.json({ code: 'X', message: 'x' }, { status: 404 })));
    act(() => nav().resetTo('earn'));
    act(() => nav().push('settle'));
    render(<CourierApp />);
    await waitFor(() => expect(top()).toHaveAttribute('data-screen', 'error'));
  });
});
