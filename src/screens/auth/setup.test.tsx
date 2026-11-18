import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthFlow } from '@/auth/flow';
import { useSession } from '@/auth/session';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { pushProvider } from '@/providers/push';
import { useToast } from '@/ui/toast';
import { PermsScreen } from './PermsScreen';
import { SetupScreen } from './SetupScreen';

const route = (screen: Route['screen']): Route => ({ key: `k-${screen}`, screen, params: {} });
const stack = () => useNav.getState().stack.map((r) => r.screen);

beforeEach(() => {
  localStorage.clear();
  useAuthFlow.getState().reset();
  useSession
    .getState()
    .setSession({ accessToken: 'a', refreshToken: 'r', user: { id: 'u-new', phone: '09120000001' } });
  // Guest tapped «ثبت سفارش» in the cart → login → otp → setup
  useNav.getState().resetTo('cart');
  useAuthFlow.getState().setIntent({ screen: 'checkout' });
  useNav.getState().push('login');
  useNav.getState().push('setup');
});

describe('<SetupScreen />', () => {
  const name = () => screen.getByLabelText('نام و نام خانوادگی');
  const ref = () => screen.getByLabelText('کد معرف (اختیاری)');
  const next = () => screen.getByRole('button', { name: 'ادامه' });

  it('name is required (≥ 2 letters)', async () => {
    render(<SetupScreen route={route('setup')} />);
    expect(screen.getByRole('heading', { name: 'تکمیل پروفایل' })).toBeInTheDocument();
    expect(next()).toBeDisabled();
    await userEvent.type(name(), 'ا');
    expect(next()).toBeDisabled();
    await userEvent.type(name(), 'میر');
    expect(next()).toBeEnabled();
  });

  it('an invalid referral code blocks; DOKOON-… is accepted (optional field)', async () => {
    render(<SetupScreen route={route('setup')} />);
    await userEvent.type(name(), 'امیر رضایی');
    await userEvent.type(ref(), 'HELLO');
    expect(screen.getByRole('alert')).toHaveTextContent('کد معرف معتبر نیست.');
    expect(next()).toBeDisabled();
    await userEvent.clear(ref());
    await userEvent.type(ref(), 'dokoon-amir');
    expect(next()).toBeEnabled();
  });

  it('saves the profile (PATCH /me), greets by name, then asks for permissions', async () => {
    let body: unknown;
    server.use(
      http.patch('*/v1/me', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'u-new', phone: '09120000001', name: 'امیر رضایی' });
      }),
    );
    render(<SetupScreen route={route('setup')} />);
    await userEvent.type(name(), '  امیر رضایی ');
    await userEvent.type(ref(), 'dokoon-amir');
    await userEvent.click(next());
    await waitFor(() => expect(stack()).toEqual(['cart', 'login', 'perms']));
    expect(body).toEqual({ name: 'امیر رضایی', referralCode: 'DOKOON-AMIR' });
    expect(useSession.getState().user?.name).toBe('امیر رضایی');
  });

  it('server error is shown and the user stays', async () => {
    server.use(
      http.patch('*/v1/me', () =>
        HttpResponse.json({ code: 'REF_INVALID', message: 'این کد معرف وجود ندارد.' }, { status: 400 }),
      ),
    );
    render(<SetupScreen route={route('setup')} />);
    await userEvent.type(name(), 'امیر');
    await userEvent.type(ref(), 'DOKOON-XYZ');
    await userEvent.click(next());
    expect(await screen.findByRole('alert')).toHaveTextContent('این کد معرف وجود ندارد.');
    expect(stack().at(-1)).toBe('setup');
  });

  it('system back cannot skip the name (account needs it for greeting and delivery)', () => {
    render(<SetupScreen route={useNav.getState().stack.at(-1)!} />);
    expect(useNav.getState().handleSystemBack()).toBe('intercepted');
    expect(stack().at(-1)).toBe('setup');
    expect(useToast.getState().toasts[0]?.text).toBe('برای ادامه، نام خود را وارد کنید.');
  });
});

describe('<PermsScreen />', () => {
  beforeEach(() => useNav.getState().setTop('perms'));

  it('«اجازه می‌دهم» asks location + notification permission, then continues to the intended screen', async () => {
    const geo = vi.fn((ok: (p: unknown) => void) => ok({ coords: { latitude: 1, longitude: 2 } }));
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: geo },
    });
    const ask = vi.spyOn(pushProvider, 'requestPermission');
    render(<PermsScreen route={route('perms')} />);
    expect(screen.getByRole('heading', { name: 'دسترسی‌ها' })).toBeInTheDocument();
    expect(screen.getByText('موقعیت مکانی')).toBeInTheDocument();
    expect(screen.getByText('اعلان‌ها')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'اجازه می‌دهم' }));
    await waitFor(() => expect(stack()).toEqual(['cart', 'checkout']));
    expect(geo).toHaveBeenCalled();
    expect(ask).toHaveBeenCalled();
  });

  it('«فعلاً نه» continues without asking (denying never blocks the user)', async () => {
    const ask = vi.spyOn(pushProvider, 'requestPermission');
    ask.mockClear();
    render(<PermsScreen route={route('perms')} />);
    await userEvent.click(screen.getByRole('button', { name: 'فعلاً نه' }));
    expect(stack()).toEqual(['cart', 'checkout']);
    expect(ask).not.toHaveBeenCalled();
  });
});
