import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { CourierApp } from '../../CourierApp';
import { isMarkedSignedOut, markSignedOut, SIGNED_OUT_KEY, useCourierSession } from '../../api/session';
import { routeFor } from '../../auth/flow';
import { COURIER_CONSENT_KEY, reloadCourierConsent, useCourierConsent } from '../../consent/consent';
import { courierHandlers, resetCourierMockDb } from '../../mocks/handlers';
import { useCourierNav } from '../../nav/nav';
import { RATE_LIMIT_TEXT } from './LoginScreen';

// KAN-90 (CP-06): OTP login, resend timer, 429, routing by `Me.status`, waiting page, boot from the
// cookie session, first-visit cookie card.
const nav = () => useCourierNav.getState();
const screens = () => nav().stack.map((r) => r.screen);
const phoneField = () => screen.getByLabelText('شماره‌ی موبایل');
const meWith = (status: string | undefined, name = 'مهدی کریمی') =>
  http.get('*/v1/c/me', () => HttpResponse.json({ name, phone: '09131234567', status, docs: [] }));

beforeEach(() => {
  server.use(...courierHandlers);
  resetCourierMockDb();
  localStorage.clear();
  reloadCourierConsent();
  useCourierSession.getState().clear();
  markSignedOut(false);
  useToast.setState({ toasts: [] });
  act(() => nav().resetTo('login'));
});

async function toCodeStep(phone = '09131234567') {
  render(<CourierApp />);
  await userEvent.type(phoneField(), phone);
  await userEvent.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }));
  return screen.findByLabelText('کد ۴ رقمی');
}

describe('routing by status', () => {
  it.each([
    ['approved', 'orders'],
    ['pending', 'wait'],
    ['suspended', 'wait'],
    ['new', 'reg'],
    [undefined, 'reg'],
  ] as const)('%s → %s', (status, screenId) => {
    expect(routeFor(status)).toBe(screenId);
  });
});

describe('phone step', () => {
  it('the button needs a valid 09… number (Persian digits too); a wrong full number shows the error', async () => {
    render(<CourierApp />);
    const btn = screen.getByRole('button', { name: 'دریافت کد تأیید' });
    expect(btn).toBeDisabled();
    await userEvent.type(phoneField(), '08123456789');
    expect(screen.getByText('شماره‌ی موبایل درست نیست')).toBeInTheDocument();
    await userEvent.clear(phoneField());
    await userEvent.type(phoneField(), '۰۹۱۲۳۴۵۶۷۸۹');
    expect(btn).toBeEnabled();
    expect(screen.queryByRole('navigation', { name: 'بخش‌های پیک' })).toBeNull();
  });

  it('429 shows the fixed rate-limit text and stays on the phone step', async () => {
    server.use(
      http.post('*/v1/c/auth/otp', () =>
        HttpResponse.json({ code: 'RATE_LIMITED', message: 'هر چیزی' }, { status: 429 }),
      ),
    );
    render(<CourierApp />);
    await userEvent.type(phoneField(), '09131234567');
    await userEvent.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(RATE_LIMIT_TEXT);
    expect(screen.queryByLabelText('کد ۴ رقمی')).toBeNull();
  });
});

describe('code step', () => {
  it('shows the number and the resend countdown; resend is disabled until it ends', async () => {
    await toCodeStep();
    expect(screen.getByText('۰۹۱۳ ۱۲۳ ۴۵۶۷')).toBeInTheDocument();
    expect(screen.getByText(/ارسال دوباره‌ی کد تا ۰۲:۰۰ دیگر/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ارسال دوباره‌ی کد' })).toBeDisabled();
  });

  it('a wrong code shows the server message and clears the field; still on login', async () => {
    const field = await toCodeStep();
    await userEvent.type(field, '0000');
    expect(await screen.findByText('کد واردشده درست نیست')).toBeInTheDocument();
    expect(screen.getByLabelText('کد ۴ رقمی')).toHaveValue('');
    expect(screen.getByLabelText('کد ۴ رقمی')).toHaveFocus();
    expect(screens()).toEqual(['login']);
    expect(useCourierSession.getState().status).toBeNull();
  });

  it('429 on verify shows the rate-limit text', async () => {
    server.use(
      http.post('*/v1/c/auth/verify', () =>
        HttpResponse.json({ code: 'RATE_LIMITED', message: 'x' }, { status: 429 }),
      ),
    );
    const field = await toCodeStep();
    await userEvent.type(field, '1234');
    expect(await screen.findByText(RATE_LIMIT_TEXT)).toBeInTheDocument();
  });

  it('back (Android too) and «ویرایش شماره» return to the number without a new SMS', async () => {
    await toCodeStep();
    act(() => {
      expect(nav().handleSystemBack()).toBe('intercepted');
    });
    expect(screen.getByRole('button', { name: 'دریافت کد تأیید' })).toBeEnabled(); // number kept
    // Same number while the code is valid: straight back to the code step (no 429 from the mock).
    await userEvent.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }));
    expect(await screen.findByLabelText('کد ۴ رقمی')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'ویرایش شماره' }));
    expect(phoneField()).toBeInTheDocument();
  });

  it('an approved courier lands on the orders tab with the greeting; back cannot return to login', async () => {
    const field = await toCodeStep();
    await userEvent.type(field, '۱۲۳۴');
    await waitFor(() => expect(screens()).toEqual(['orders']));
    expect(screen.getByRole('heading', { level: 1, name: 'سلام مهدی کریمی عزیز' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'بخش‌های پیک' })).toBeInTheDocument();
    act(() => {
      expect(nav().handleSystemBack()).toBe('exit-armed');
    });
  });

  it('pending → waiting page; new → registration', async () => {
    const field = await toCodeStep('09120000002');
    await userEvent.type(field, '1234');
    expect(await screen.findByRole('heading', { name: 'حساب شما در انتظار تأیید است' })).toBeInTheDocument();
    expect(screens()).toEqual(['wait']);

    act(() => nav().resetTo('login'));
    await userEvent.clear(phoneField());
    await userEvent.type(phoneField(), '09120000001');
    await userEvent.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }));
    await userEvent.type(await screen.findByLabelText('کد ۴ رقمی'), '1234');
    await waitFor(() => expect(screens()).toEqual(['reg']));
  });

  it('«پیک جدید هستم» opens the same verification under a top bar; back returns to login', async () => {
    render(<CourierApp />);
    await userEvent.click(screen.getByRole('button', { name: 'پیک جدید هستم، ثبت‌نام می‌کنم' }));
    expect(screen.getByRole('heading', { name: 'ثبت‌نام پیک جدید' })).toBeInTheDocument();
    expect(screens()).toEqual(['login', 'login']);
    act(() => {
      nav().handleSystemBack();
    });
    expect(screens()).toEqual(['login']);
  });

  it('a full-page error (offline) keeps the form; retry sends again', async () => {
    let calls = 0;
    server.use(
      http.post('*/v1/c/auth/otp', () => {
        calls += 1;
        return calls === 1 ? HttpResponse.error() : new HttpResponse(null, { status: 204 });
      }),
    );
    render(<CourierApp />);
    await userEvent.type(phoneField(), '09131234567');
    await userEvent.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }));
    await waitFor(() => expect(screens()).toEqual(['login', 'error']));
    await userEvent.click(await screen.findByRole('button', { name: 'تلاش دوباره' }));
    await waitFor(() => expect(calls).toBe(2));
    expect(screens()).toEqual(['login']);
  });
});

describe('boot (session check)', () => {
  it('a valid cookie session goes straight to the screen for its status', async () => {
    server.use(meWith('approved'));
    act(() => nav().resetTo('boot'));
    render(<CourierApp />);
    await waitFor(() => expect(screens()).toEqual(['orders']));
    expect(useCourierSession.getState().name).toBe('مهدی کریمی');
  });

  it('no session (401) → login quietly, not the «session expired» page', async () => {
    act(() => nav().resetTo('boot'));
    render(<CourierApp />);
    await waitFor(() => expect(screens()).toEqual(['login']));
  });

  it('after «خروج» the next start opens login without asking the server', async () => {
    let asked = 0;
    server.use(
      http.get('*/v1/c/me', () => {
        asked += 1;
        return HttpResponse.json({ status: 'approved' });
      }),
    );
    markSignedOut(true);
    act(() => nav().resetTo('boot'));
    render(<CourierApp />);
    await waitFor(() => expect(screens()).toEqual(['login']));
    expect(asked).toBe(0);
  });

  it('a successful verify clears the signed-out mark', async () => {
    markSignedOut(true);
    const field = await toCodeStep();
    await userEvent.type(field, '1234');
    await waitFor(() => expect(screens()).toEqual(['orders']));
    expect(isMarkedSignedOut()).toBe(false);
    expect(localStorage.getItem(SIGNED_OUT_KEY)).toBeNull();
  });

  it('offline at start shows the offline page above boot; retry checks again', async () => {
    let calls = 0;
    server.use(
      http.get('*/v1/c/me', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.error()
          : HttpResponse.json({ name: 'مهدی کریمی', status: 'pending' });
      }),
    );
    act(() => nav().resetTo('boot'));
    render(<CourierApp />);
    await waitFor(() => expect(screens()).toEqual(['boot', 'error']));
    await userEvent.click(await screen.findByRole('button', { name: 'تلاش دوباره' }));
    await waitFor(() => expect(screens()).toEqual(['wait']));
  });
});

describe('waiting page', () => {
  it('«بررسی دوباره» while still pending says so; once approved it opens the orders tab', async () => {
    server.use(meWith('pending'));
    useCourierSession.getState().setSession({ status: 'pending', name: 'مهدی کریمی' });
    act(() => nav().resetTo('wait'));
    render(<CourierApp />);
    await userEvent.click(screen.getByRole('button', { name: 'بررسی دوباره' }));
    await waitFor(() =>
      expect(useToast.getState().toasts.map((t) => t.text)).toContain('هنوز در حال بررسی است'),
    );
    server.use(meWith('approved'));
    await userEvent.click(screen.getByRole('button', { name: 'بررسی دوباره' }));
    await waitFor(() => expect(screens()).toEqual(['orders']));
  });

  it('suspended shows its own text; «خروج از حساب» goes to login', async () => {
    useCourierSession.getState().setSession({ status: 'suspended' });
    act(() => nav().resetTo('wait'));
    render(<CourierApp />);
    expect(screen.getByRole('heading', { name: 'حساب شما موقتاً غیرفعال است' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'خروج از حساب' }));
    expect(screens()).toEqual(['login']);
    expect(isMarkedSignedOut()).toBe(true);
  });
});

describe('cookie card (first visit)', () => {
  const card = () => screen.getByRole('region', { name: 'کوکی‌ها' });

  it('shows on login until decided; «فقط ضروری» stores optional ones off and hides it', async () => {
    render(<CourierApp />);
    await userEvent.click(within(card()).getByRole('button', { name: 'فقط ضروری' }));
    expect(screen.queryByRole('region', { name: 'کوکی‌ها' })).toBeNull();
    expect(JSON.parse(localStorage.getItem(COURIER_CONSENT_KEY)!)).toMatchObject({
      performance: false,
      analytics: false,
      synced: false,
    });
  });

  it('«تنظیمات» shows essential (fixed), performance and analytics (off by default)', async () => {
    render(<CourierApp />);
    await userEvent.click(within(card()).getByRole('button', { name: 'تنظیمات' }));
    const switches = within(card()).getAllByRole('switch');
    expect(switches).toHaveLength(3);
    expect(switches[0]).toBeDisabled();
    expect(switches[0]).toBeChecked();
    expect(switches[1]).not.toBeChecked();
    await userEvent.click(switches[2]);
    await userEvent.click(within(card()).getByRole('button', { name: 'ذخیره‌ی انتخاب‌ها' }));
    expect(useCourierConsent.getState().choice).toEqual({ performance: false, analytics: true });
  });

  it('the choice is sent with PUT /c/consent after signing in', async () => {
    let sent: unknown = null;
    server.use(
      http.put('*/v1/c/consent', async ({ request }) => {
        sent = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const field = await toCodeStep();
    await userEvent.click(within(card()).getByRole('button', { name: 'قبول همه' }));
    await userEvent.type(field, '1234');
    await waitFor(() => expect(sent).toEqual({ performance: true, analytics: true }));
    await waitFor(() => expect(useCourierConsent.getState().synced).toBe(true));
  });
});
