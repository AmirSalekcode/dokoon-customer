import { act, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { CourierApp } from '../../CourierApp';
import { docRow, docState, docsSummary } from '../../account/docs';
import { useCourierMe } from '../../account/me';
import { useCourierSession } from '../../api/session';
import { reloadCourierConsent, useCourierConsent, COURIER_CONSENT_KEY } from '../../consent/consent';
import { courierHandlers, resetCourierMockDb } from '../../mocks/handlers';
import { useCourierNav } from '../../nav/nav';
import { signedInCourier } from '../../test/session';

// KAN-101 (CP-17): my documents (data-driven list, states, renew upload), support (FAQ), cookie settings
// (`PUT /c/consent`), entries and warning dot on the account tab.
const nav = () => useCourierNav.getState();
const screens = () => nav().stack.map((r) => r.screen);
const top = () => document.querySelector<HTMLElement>('main:not([hidden])')!;
const url = (path: string) => new RegExp(`${path.replace(/\//g, '\\/')}(\\?|$)`);
const NOW = Date.parse('2026-11-24T12:00:00+03:30');
const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

beforeEach(() => {
  server.use(...courierHandlers);
  resetCourierMockDb();
  localStorage.clear();
  reloadCourierConsent();
  useToast.setState({ toasts: [] });
  useCourierMe.getState().reset();
  signedInCourier();
  act(() => nav().resetTo('account'));
});
afterEach(() => {
  vi.restoreAllMocks();
  useCourierSession.getState().clear();
});

describe('document states', () => {
  it('ok, expiring (≤ 30 days or server bad + future date), expired, in review, rejected, missing', () => {
    expect(docState({ type: 'a', status: 'ok' }, NOW)).toBe('ok');
    expect(docState({ type: 'a', status: 'ok', expiresAt: iso(NOW + 200 * DAY) }, NOW)).toBe('ok');
    expect(docState({ type: 'a', status: 'ok', expiresAt: iso(NOW + 20 * DAY) }, NOW)).toBe('expiring');
    expect(docState({ type: 'a', status: 'bad', expiresAt: iso(NOW + 9 * DAY) }, NOW)).toBe('expiring');
    expect(docState({ type: 'a', status: 'ok', expiresAt: iso(NOW - 2 * DAY) }, NOW)).toBe('expired');
    expect(docState({ type: 'a', status: 'wait' }, NOW)).toBe('wait');
    expect(docState({ type: 'a', status: 'bad' }, NOW)).toBe('rejected');
    expect(docState(undefined, NOW)).toBe('missing');
  });

  it('rows offer renew for everything but ok and in review; never green states', () => {
    const t = { id: 'ins', label: 'بیمه‌نامه', sub: 'صفحه‌ی اول', required: true };
    expect(docRow(t, { type: 'ins', status: 'bad', expiresAt: iso(NOW + 9 * DAY) }, NOW)).toMatchObject({
      status: 'bad',
      statusLabel: 'نزدیک انقضا',
      canRenew: true,
    });
    expect(docRow(t, { type: 'ins', status: 'wait' }, NOW)).toMatchObject({ status: 'wait', canRenew: false });
    expect(docRow(t, undefined, NOW)).toMatchObject({
      status: 'bad',
      statusLabel: 'بارگذاری نشده',
      canRenew: true,
      actionLabel: 'بارگذاری',
    });
    expect(docRow({ ...t, required: false }, undefined, NOW)).toMatchObject({ status: 'wait', sub: 'اختیاری' });
    expect(docRow(t, undefined, NOW).sub).toBe('برای دریافت سفارش لازم است');
  });

  it('account summary: dot only when the courier must act', () => {
    expect(docsSummary([{ type: 'a', status: 'ok' }], NOW)).toEqual({ sub: 'همه‌ی مدارک تأیید شده', dot: false });
    expect(docsSummary([{ type: 'a', status: 'wait' }], NOW).dot).toBe(false);
    expect(docsSummary([{ type: 'a', status: 'bad', expiresAt: iso(NOW + 9 * DAY) }], NOW)).toEqual({
      sub: 'یک مدرک نزدیک انقضاست',
      dot: true,
    });
  });
});

describe('my documents', () => {
  it('account row has the warning dot; the page lists every doc type; renew sends the file → in review', async () => {
    render(<CourierApp />);
    const row = await within(top()).findByRole('button', { name: /مدارک من/ });
    await waitFor(() => expect(row).toHaveTextContent('یک مدرک نزدیک انقضاست'));
    expect(within(row).getByText('نیاز به اقدام')).toBeInTheDocument();
    await userEvent.click(row);
    expect(screens()).toEqual(['account', 'docs']);
    const list = await within(top()).findByRole('list', { name: 'مدارک' });
    // From GET /c/doc-types (five in the mock), never a fixed list.
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(5));
    expect(list).toHaveTextContent('نزدیک انقضا');
    expect(list).toHaveTextContent('بارگذاری نشده'); // the optional face photo was never sent

    await userEvent.upload(
      within(top()).getByTestId('doc-file'),
      new File([new Uint8Array(1000)], 'ins.pdf', { type: 'application/pdf' }),
    );
    // No row picked yet: nothing is sent.
    expect(within(list).queryByText('در حال بررسی')).toBeNull();
    await userEvent.click(within(top()).getByRole('button', { name: 'بارگذاری مجدد بیمه‌نامه شخص ثالث' }));
    await userEvent.upload(
      within(top()).getByTestId('doc-file'),
      new File([new Uint8Array(1000)], 'ins.pdf', { type: 'application/pdf' }),
    );
    await waitFor(() => expect(list).toHaveTextContent('در حال بررسی'));
    expect(within(top()).queryByRole('button', { name: 'بارگذاری مجدد بیمه‌نامه شخص ثالث' })).toBeNull();
    act(() => void nav().handleSystemBack());
    expect(screens()).toEqual(['account']);
  });

  it('a file too large is refused before sending', async () => {
    act(() => nav().push('docs'));
    render(<CourierApp />);
    await within(top()).findByRole('list', { name: 'مدارک' });
    await userEvent.click(await within(top()).findByRole('button', { name: 'بارگذاری مجدد بیمه‌نامه شخص ثالث' }));
    await userEvent.upload(
      within(top()).getByTestId('doc-file'),
      new File([new Uint8Array(11 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' }),
    );
    await waitFor(() => expect(useToast.getState().toasts.map((t) => t.text).join()).toMatch(/حجم/));
  });

  it('doc types that fail to load show an inline retry', async () => {
    server.use(http.get(url('/c/doc-types'), () => HttpResponse.json({ code: 'X', message: 'x' }, { status: 400 })));
    act(() => nav().push('docs'));
    render(<CourierApp />);
    expect(await within(top()).findByText('فهرست مدارک دریافت نشد.')).toBeInTheDocument();
    server.use(...courierHandlers);
    await userEvent.click(within(top()).getByRole('button', { name: 'تلاش دوباره' }));
    expect(await within(top()).findByRole('list', { name: 'مدارک' })).toBeInTheDocument();
  });
});

describe('support and cookies', () => {
  it('support: the FAQ opens one answer at a time', async () => {
    render(<CourierApp />);
    await userEvent.click(within(top()).getByRole('button', { name: /پشتیبانی/ }));
    expect(screens()).toEqual(['account', 'support']);
    const q1 = within(top()).getByRole('button', { name: 'اگر مشتری جواب نداد چه کنم؟' });
    await userEvent.click(q1);
    expect(q1).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(within(top()).getByRole('button', { name: 'چرا موقعیتم ثبت می‌شود؟' }));
    expect(q1).toHaveAttribute('aria-expanded', 'false');
  });

  it('cookies: essential fixed; save stores the choice and sends PUT /c/consent', async () => {
    const sent: unknown[] = [];
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PUT' && new URL(request.url).pathname.endsWith('/c/consent'))
        sent.push(await request.clone().json());
    });
    render(<CourierApp />);
    await userEvent.click(within(top()).getByRole('button', { name: /کوکی‌ها و حریم خصوصی/ }));
    expect(screens()).toEqual(['account', 'cookies']);
    expect(within(top()).getByRole('switch', { name: /ضروری/ })).toBeDisabled();
    await userEvent.click(within(top()).getByRole('switch', { name: /آمار استفاده/ }));
    await userEvent.click(within(top()).getByRole('button', { name: 'ذخیره‌ی انتخاب' }));
    await waitFor(() => expect(screens()).toEqual(['account']));
    server.events.removeAllListeners();
    expect(sent).toEqual([{ performance: false, analytics: true }]);
    expect(useCourierConsent.getState()).toMatchObject({ decided: true, synced: true });
    expect(JSON.parse(localStorage.getItem(COURIER_CONSENT_KEY)!)).toMatchObject({ analytics: true });
  });
});
