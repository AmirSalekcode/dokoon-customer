import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { CourierApp } from '../../CourierApp';
import { useCourierSession } from '../../api/session';
import type { Earnings } from '../../api/types';
import { toLogin } from '../../auth/flow';
import { courierHandlers, resetCourierMockDb } from '../../mocks/handlers';
import { useEarnings } from '../../money/earnings';
import { chartBars, statCards, thousands } from '../../money/present';
import { useCourierNav } from '../../nav/nav';
import { signedInCourier } from '../../test/session';

// KAN-98 (CP-14): earnings tab — periods, balance (sample label), four stats, bar chart. Every number is
// the server's: the tests feed deliberately inconsistent data and expect it shown verbatim (like D-120).
const nav = () => useCourierNav.getState();
const top = () => document.querySelector<HTMLElement>('main:not([hidden])')!;
const url = (path: string) => new RegExp(`${path.replace(/\//g, '\\/')}(\\?|$)`);

/** total ≠ Σ chart, avg ≠ total / trips, balance ≠ owed − cash: none of it may be "fixed" by the app. */
const ODD: Earnings = {
  period: 'today',
  total: 123_000,
  trips: 7,
  hours: 2.5,
  avg: 99_000,
  balance: 5_000,
  cashHeld: 777_000,
  dokoonOwes: 10,
  chart: [
    { label: '9', amount: 1_000 },
    { label: '11', amount: 152_500 },
    { label: '13', amount: 40_000 },
  ],
};

beforeEach(() => {
  server.use(...courierHandlers);
  resetCourierMockDb();
  localStorage.clear();
  useToast.setState({ toasts: [] });
  useEarnings.getState().reset();
  signedInCourier();
  act(() => nav().resetTo('earn'));
});
afterEach(() => {
  vi.restoreAllMocks();
  useCourierSession.getState().clear();
});

describe('present (pure formatting)', () => {
  it('shows server numbers as sent, never derived', () => {
    const cards = statCards(ODD).map((c) => [c.label, c.value]);
    expect(cards).toEqual([
      ['درآمد امروز', '۱۲۳٬۰۰۰ تومان'],
      ['سفارش‌ها', '۷'],
      ['ساعت آنلاین', '۲٫۵'],
      ['میانگین هر سفارش', '۹۹٬۰۰۰ تومان'],
    ]);
  });

  it('chart keeps server order and labels, highlights the last bar, values in thousands', () => {
    const bars = chartBars(ODD);
    expect(bars.map((b) => [b.label, b.valueText, b.on])).toEqual([
      ['۹', '۱ هزار', false],
      ['۱۱', '۱۵۲٫۵ هزار', false],
      ['۱۳', '۴۰ هزار', true],
    ]);
    expect(thousands(2_890_000)).toBe('۲٬۸۹۰ هزار');
  });

  it('no bars when nothing was earned (the chart shows its empty text)', () => {
    expect(chartBars({ ...ODD, chart: [{ label: '9', amount: 0 }] })).toEqual([]);
  });
});

describe('earnings tab', () => {
  it('opens on today: balance (sample note), four stats and the chart from the server', async () => {
    server.use(http.get(url('/c/earnings'), () => HttpResponse.json(ODD)));
    render(<CourierApp />);
    const balance = await within(top()).findByRole('region', { name: 'مانده‌ی حساب' });
    expect(balance).toHaveTextContent('۵٬۰۰۰ تومان');
    expect(within(balance).getAllByRole('definition').map((d) => d.textContent)).toEqual([
      '۷۷۷٬۰۰۰ تومان',
      '۱۰ تومان',
    ]);
    expect(balance).toHaveTextContent('نمونه');
    expect(within(top()).getByText('۱۲۳٬۰۰۰ تومان')).toBeInTheDocument();
    expect(within(top()).getByText('۹۹٬۰۰۰ تومان')).toBeInTheDocument();
    const chart = within(top()).getByRole('img', { name: /درآمد ساعتی امروز/ });
    expect(chart).toHaveAccessibleName('درآمد ساعتی امروز (تومان): ۹ ۱ هزار، ۱۱ ۱۵۲٫۵ هزار، ۱۳ ۴۰ هزار');
    expect(within(top()).getByRole('tab', { name: 'امروز' })).toHaveAttribute('aria-selected', 'true');
  });

  it('switching period loads that period; the choice is kept on return', async () => {
    render(<CourierApp />);
    await within(top()).findByText('۴۸۰٬۰۰۰ تومان');
    await userEvent.click(within(top()).getByRole('tab', { name: 'این هفته' }));
    expect(await within(top()).findByText('۲٬۸۶۰٬۰۰۰ تومان')).toBeInTheDocument();
    expect(within(top()).getByRole('img', { name: /درآمد روزانه‌ی این هفته/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'حساب' }));
    await userEvent.click(screen.getByRole('button', { name: 'درآمد' }));
    expect(within(top()).getByRole('tab', { name: 'این هفته' })).toHaveAttribute('aria-selected', 'true');
  });

  it('hides «طلب از دکون» when the server does not send it', async () => {
    const { dokoonOwes: _omit, ...rest } = ODD;
    server.use(http.get(url('/c/earnings'), () => HttpResponse.json(rest)));
    render(<CourierApp />);
    const balance = await within(top()).findByRole('region', { name: 'مانده‌ی حساب' });
    expect(within(balance).getAllByRole('term').map((t) => t.textContent)).toEqual(['نقدی در دست شما']);
  });

  it('nothing earned yet: zero stats and the chart empty text', async () => {
    server.use(
      http.get(url('/c/earnings'), () =>
        HttpResponse.json({ ...ODD, total: 0, trips: 0, avg: 0, chart: [{ label: '9', amount: 0 }] }),
      ),
    );
    render(<CourierApp />);
    expect(
      await within(top()).findByRole('img', { name: /امروز هنوز سفارشی تحویل نداده‌اید/ }),
    ).toBeInTheDocument();
  });

  it('a 500 shows the full error page; retry loads the numbers', async () => {
    let fail = true;
    server.use(
      http.get(url('/c/earnings'), () =>
        fail ? HttpResponse.json({ code: 'X', message: 'x' }, { status: 500 }) : HttpResponse.json(ODD),
      ),
    );
    render(<CourierApp />);
    await waitFor(() => expect(top()).toHaveAttribute('data-screen', 'error'));
    fail = false;
    await userEvent.click(within(top()).getByRole('button', { name: 'تلاش دوباره' }));
    await waitFor(() => expect(top()).toHaveAttribute('data-screen', 'earn'));
    expect(await within(top()).findByText('۱۲۳٬۰۰۰ تومان')).toBeInTheDocument();
  });

  it('a non-page error shows an inline retry', async () => {
    server.use(http.get(url('/c/earnings'), () => HttpResponse.json({ code: 'X', message: 'x' }, { status: 400 })));
    render(<CourierApp />);
    expect(await within(top()).findByText('درآمد دریافت نشد.')).toBeInTheDocument();
    server.use(http.get(url('/c/earnings'), () => HttpResponse.json(ODD)));
    await userEvent.click(within(top()).getByRole('button', { name: 'تلاش دوباره' }));
    expect(await within(top()).findByText('۱۲۳٬۰۰۰ تومان')).toBeInTheDocument();
  });

  it('a failed refresh keeps the numbers already on screen (no error page)', async () => {
    render(<CourierApp />);
    await within(top()).findByText('۴۸۰٬۰۰۰ تومان');
    // 404 is a full-page kind with no GET retry: on first load it would cover the tab.
    server.use(http.get(url('/c/earnings'), () => HttpResponse.json({ code: 'X', message: 'x' }, { status: 404 })));
    await userEvent.click(screen.getByRole('button', { name: 'حساب' }));
    await userEvent.click(screen.getByRole('button', { name: 'درآمد' }));
    await waitFor(() => expect(useEarnings.getState().byPeriod.today.status).toBe('ready'));
    expect(top()).toHaveAttribute('data-screen', 'earn');
    expect(within(top()).getByText('۴۸۰٬۰۰۰ تومان')).toBeInTheDocument();
  });

  it('going to login forgets the previous courier’s numbers', async () => {
    render(<CourierApp />);
    await within(top()).findByText('۴۸۰٬۰۰۰ تومان');
    act(() => toLogin());
    expect(useEarnings.getState().byPeriod.today.data).toBeNull();
  });
});
