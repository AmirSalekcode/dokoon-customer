import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { CourierApp } from '../../CourierApp';
import { useCourierMe } from '../../account/me';
import { cardSub, infoRows, maskPhone } from '../../account/present';
import { useCourierSession } from '../../api/session';
import type { MeProfile } from '../../api/types';
import { toLogin } from '../../auth/flow';
import { courierHandlers, resetCourierMockDb } from '../../mocks/handlers';
import { useCourierNav } from '../../nav/nav';
import { signedInCourier } from '../../test/session';

// KAN-100 (CP-16): account tab card, «اطلاعات من» with server-masked values, Sheba change with a fresh code
// to the courier's own mobile + city manager review.
const nav = () => useCourierNav.getState();
const screens = () => nav().stack.map((r) => r.screen);
const top = () => document.querySelector<HTMLElement>('main:not([hidden])')!;
const url = (path: string) => new RegExp(`${path.replace(/\//g, '\\/')}(\\?|$)`);
const strip = (s: string) => s.replace(/[⁦-⁩]/g, '');
const VALID_SHEBA = 'IR062960000000100324200001';

beforeEach(() => {
  server.use(...courierHandlers);
  resetCourierMockDb();
  localStorage.clear();
  useToast.setState({ toasts: [] });
  useCourierMe.getState().reset();
  signedInCourier();
  act(() => nav().resetTo('account'));
});
afterEach(() => {
  vi.restoreAllMocks();
  useCourierSession.getState().clear();
});

describe('present', () => {
  it('masks the own mobile and shows only the fields the server sent', () => {
    expect(maskPhone('09131234567')).toBe('۰۹۱۳•••۴۵۶۷');
    const me: MeProfile = { name: 'مهدی کریمی', phone: '09131234567', status: 'approved', city: 'شهرضا' };
    expect(strip(cardSub(me))).toBe('۰۹۱۳•••۴۵۶۷ · شهرضا');
    expect(infoRows(me).map((r) => r.label)).toEqual(['نام', 'موبایل']);
    const full = { ...me, nationalIdMasked: '007*****12', plate: '12 345 67', shebaMasked: 'IR** 4210' };
    expect(infoRows(full).map((r) => [r.label, strip(r.value)])).toEqual([
      ['نام', 'مهدی کریمی'],
      ['موبایل', '۰۹۱۳•••۴۵۶۷'],
      ['کد ملی', '۰۰۷*****۱۲'],
      ['پلاک موتور', '۱۲ ۳۴۵ ۶۷'],
      ['شماره‌ی شبا', 'IR** ۴۲۱۰'],
    ]);
  });
});

describe('account tab', () => {
  it('shows the courier card from GET /c/me and the sub-pages', async () => {
    render(<CourierApp />);
    const card = await within(top()).findByRole('region', { name: 'کارت پیک' });
    await waitFor(() => expect(card).toHaveTextContent('مهدی کریمی'));
    await waitFor(() => expect(strip(card.textContent ?? '')).toContain('۰۹۱۳•••۴۵۶۷ · شهرضا'));
    for (const name of ['اطلاعات من', 'تاریخچه‌ی سفارش‌ها', 'تسویه‌حساب‌ها', 'مجوزهای دستگاه'])
      expect(within(top()).getByRole('button', { name: new RegExp(name) })).toBeInTheDocument();
  });

  it('a failed reload keeps the card (no error page over it)', async () => {
    render(<CourierApp />);
    await within(top()).findByText('مهدی کریمی');
    server.use(http.get(url('/c/me'), () => HttpResponse.json({ code: 'X', message: 'x' }, { status: 404 })));
    await userEvent.click(screen.getByRole('button', { name: 'درآمد' }));
    await userEvent.click(screen.getByRole('button', { name: 'حساب' }));
    await waitFor(() => expect(useCourierMe.getState().status).toBe('ready'));
    expect(top()).toHaveAttribute('data-screen', 'account');
    expect(within(top()).getByText('مهدی کریمی')).toBeInTheDocument();
  });

  it('going to login forgets the profile', async () => {
    render(<CourierApp />);
    await within(top()).findByText('مهدی کریمی');
    act(() => toLogin());
    expect(useCourierMe.getState().me).toBeNull();
  });
});

describe('my info + Sheba change', () => {
  async function openInfo() {
    render(<CourierApp />);
    await within(top()).findByText('مهدی کریمی');
    await userEvent.click(within(top()).getByRole('button', { name: /اطلاعات من/ }));
    expect(screens()).toEqual(['account', 'info']);
  }

  it('lists masked values; back returns to the account tab', async () => {
    await openInfo();
    const text = strip(top().textContent ?? '');
    expect(text).toContain('۰۰۷*****۱۲');
    expect(text).toContain('۱۲ ۳۴۵ ۶۷');
    expect(text).toContain('IR** **** **** **** **** **۴۲ ۱۰');
    act(() => void nav().handleSystemBack());
    expect(screens()).toEqual(['account']);
  });

  it('new Sheba → code to the own mobile → request; the info page then says it is under review', async () => {
    const calls: { path: string; body: unknown }[] = [];
    server.events.on('request:start', async ({ request }) => {
      const path = new URL(request.url).pathname;
      if (request.method === 'POST' && /\/c\/(auth\/otp|sheba-change)$/.test(path))
        calls.push({ path: path.replace(/^.*\/c\//, ''), body: await request.clone().json() });
    });
    await openInfo();
    await userEvent.click(within(top()).getByRole('button', { name: 'درخواست تغییر شبا' }));
    expect(screens()).toEqual(['account', 'info', 'sheba']);
    const send = within(top()).getByRole('button', { name: 'ارسال کد تأیید' });
    await userEvent.type(within(top()).getByLabelText('شماره‌ی شبای تازه'), 'IR06');
    expect(send).toBeDisabled();
    await userEvent.clear(within(top()).getByLabelText('شماره‌ی شبای تازه'));
    await userEvent.type(within(top()).getByLabelText('شماره‌ی شبای تازه'), VALID_SHEBA);
    await userEvent.click(send);
    await userEvent.type(await within(top()).findByLabelText('کد تأیید پیامکی'), '۱۲۳۴');
    await userEvent.click(within(top()).getByRole('button', { name: 'ثبت درخواست تغییر شبا' }));
    await waitFor(() => expect(screens()).toEqual(['account', 'info']));
    server.events.removeAllListeners();
    expect(calls).toEqual([
      { path: 'auth/otp', body: { phone: '09131234567' } },
      { path: 'sheba-change', body: { sheba: VALID_SHEBA, otpCode: '1234' } },
    ]);
    expect(within(top()).getByRole('status')).toHaveTextContent('در حال بررسی');
    expect(within(top()).queryByRole('button', { name: 'درخواست تغییر شبا' })).toBeNull();
  });

  it('a code asked for too soon shows the server message', async () => {
    server.use(
      http.post(url('/c/auth/otp'), () =>
        HttpResponse.json({ code: 'RATE_LIMITED', message: 'کمی بعد دوباره تلاش کنید' }, { status: 429 }),
      ),
    );
    act(() => nav().push('sheba'));
    useCourierMe.getState().set({ name: 'x', phone: '09131234567', status: 'approved' });
    render(<CourierApp />);
    await userEvent.type(within(top()).getByLabelText('شماره‌ی شبای تازه'), VALID_SHEBA);
    await userEvent.click(within(top()).getByRole('button', { name: 'ارسال کد تأیید' }));
    expect(await within(top()).findByRole('alert')).toHaveTextContent('کمی بعد دوباره تلاش کنید');
  });
});
