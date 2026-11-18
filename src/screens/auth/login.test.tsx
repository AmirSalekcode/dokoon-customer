import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthFlow } from '@/auth/flow';
import { useSession } from '@/auth/session';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { LoginScreen } from './LoginScreen';
import { OtpScreen } from './OtpScreen';

const route = (screen: Route['screen'], params: Record<string, string> = {}): Route => ({
  key: 'k',
  screen,
  params,
});
const top = () => useNav.getState().stack.at(-1)!;
const stack = () => useNav.getState().stack.map((r) => r.screen);

beforeEach(() => {
  localStorage.clear();
  useSession.getState().clear();
  useAuthFlow.getState().reset();
  useNav.getState().resetTo('account');
  useNav.getState().push('login');
});

describe('<LoginScreen />', () => {
  const phone = () => screen.getByLabelText('شماره‌ی موبایل');
  const submit = () => screen.getByRole('button', { name: 'دریافت کد تأیید' });
  const terms = () => screen.getByRole('checkbox', { name: /قوانین و مقررات/ });

  it('shows the title and keeps «دریافت کد» disabled until phone is valid AND terms accepted', async () => {
    render(<LoginScreen route={route('login')} />);
    expect(screen.getByRole('heading', { name: 'ورود یا ثبت‌نام' })).toBeInTheDocument();
    expect(submit()).toBeDisabled();
    await userEvent.type(phone(), '09131234567');
    expect(submit()).toBeDisabled();
    await userEvent.click(terms());
    expect(terms()).toHaveAttribute('aria-checked', 'true');
    expect(submit()).toBeEnabled();
  });

  it('accepts Persian digits and shows them in Persian', async () => {
    render(<LoginScreen route={route('login')} />);
    await userEvent.type(phone(), '۰۹۱۳۱۲۳۴۵۶۷');
    expect(phone()).toHaveValue('۰۹۱۳۱۲۳۴۵۶۷');
    await userEvent.click(terms());
    expect(submit()).toBeEnabled();
  });

  it('a complete but invalid number shows the error', async () => {
    render(<LoginScreen route={route('login')} />);
    await userEvent.type(phone(), '08131234567');
    expect(screen.getByRole('alert')).toHaveTextContent('شماره‌ی موبایل معتبر نیست (مثل ۰۹۱۲۳۴۵۶۷۸۹).');
  });

  it('sends the code and opens OTP with phone, resend time and code length', async () => {
    render(<LoginScreen route={route('login')} />);
    await userEvent.type(phone(), '09131234567');
    await userEvent.click(terms());
    await userEvent.click(submit());
    await waitFor(() => expect(top().screen).toBe('otp'));
    expect(top().params).toEqual({ phone: '09131234567', resend: '120', len: '4' });
  });

  it('server limit (429) is shown inline with the server message', async () => {
    server.use(
      http.post('*/v1/auth/otp/request', () =>
        HttpResponse.json({ code: 'RATE_LIMITED', message: 'تعداد درخواست‌ها زیاد است.' }, { status: 429 }),
      ),
    );
    render(<LoginScreen route={route('login')} />);
    await userEvent.type(phone(), '09131234567');
    await userEvent.click(terms());
    await userEvent.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent('تعداد درخواست‌ها زیاد است.');
    expect(top().screen).toBe('login');
  });

  it('the terms link opens the terms page', async () => {
    render(<LoginScreen route={route('login')} />);
    await userEvent.click(screen.getByRole('button', { name: 'قوانین و مقررات' }));
    expect(top()).toMatchObject({ screen: 'legal', params: { doc: 'terms' } });
  });

  it('back closes login and forgets the pending intent (e.g. checkout)', async () => {
    useAuthFlow.getState().setIntent({ screen: 'checkout' });
    render(<LoginScreen route={route('login')} />);
    await userEvent.click(screen.getByRole('button', { name: 'بازگشت' }));
    expect(stack()).toEqual(['account']);
    expect(useAuthFlow.getState().intent).toBeNull();
  });
});

describe('<OtpScreen />', () => {
  const params = { phone: '09131234567', resend: '120', len: '4' };
  const code = () => screen.getByLabelText('کد تأیید');
  afterEach(() => vi.useRealTimers());

  it('shows the formatted phone and a code field for one-time-code autofill', () => {
    render(<OtpScreen route={route('otp', params)} />);
    expect(screen.getByText(/۰۹۱۳ ۱۲۳ ۴۵۶۷/)).toBeInTheDocument();
    expect(code()).toHaveAttribute('autocomplete', 'one-time-code');
    expect(code()).toHaveAttribute('inputmode', 'numeric');
  });

  it('correct code → logged in → back where the user was (known user)', async () => {
    useNav.getState().push('otp', params);
    render(<OtpScreen route={route('otp', params)} />);
    await userEvent.type(code(), '1234');
    await waitFor(() => expect(useSession.getState().accessToken).toBe('mock-access'));
    expect(stack()).toEqual(['account']);
  });

  it('new user → profile setup', async () => {
    const p = { ...params, phone: '09120000001' };
    useNav.getState().push('otp', p);
    render(<OtpScreen route={route('otp', p)} />);
    await userEvent.type(code(), '1234');
    await waitFor(() => expect(top().screen).toBe('setup'));
  });

  it('wrong code: message, field cleared, still on OTP', async () => {
    useNav.getState().push('otp', params);
    render(<OtpScreen route={route('otp', params)} />);
    await userEvent.type(code(), '9999');
    expect(await screen.findByRole('alert')).toHaveTextContent('کد واردشده درست نیست.');
    expect(code()).toHaveValue('');
    expect(top().screen).toBe('otp');
    expect(useSession.getState().accessToken).toBeNull();
  });

  it('resend is locked with a countdown, then sends again and restarts it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const requests: string[] = [];
    server.use(
      http.post('*/v1/auth/otp/request', async ({ request }) => {
        requests.push(((await request.json()) as { phone: string }).phone);
        return HttpResponse.json({ resendAfterSec: 120, codeLength: 4 });
      }),
    );
    render(<OtpScreen route={route('otp', params)} />);
    expect(screen.getByText('ارسال مجدد کد تا ۰۲:۰۰ دیگر')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ارسال مجدد کد' })).toBeDisabled();
    await act(async () => {
      vi.advanceTimersByTime(61_000);
    });
    expect(screen.getByText('ارسال مجدد کد تا ۰۰:۵۹ دیگر')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(59_000);
    });
    expect(screen.getByRole('button', { name: 'ارسال مجدد کد' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'ارسال مجدد کد' }));
    await waitFor(() => expect(requests).toEqual(['09131234567']));
    expect(screen.getByRole('button', { name: 'ارسال مجدد کد' })).toBeDisabled();
  });

  it('«ویرایش شماره» goes back to the phone screen', async () => {
    useNav.getState().push('otp', params);
    render(<OtpScreen route={route('otp', params)} />);
    await userEvent.click(screen.getByRole('button', { name: 'ویرایش شماره' }));
    expect(top().screen).toBe('login');
  });
});
