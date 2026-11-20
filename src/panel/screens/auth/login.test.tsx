import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { usePanelSession } from '../../api/session';
import { panelHandlers, resetPanelMockDb } from '../../mocks/handlers';
import { usePanelNav } from '../../nav/nav';
import { PanelShell } from '../../shell/PanelShell';
import { useRestaurant } from '../../state/restaurant';
import { signedIn, signedOut } from '../../test/session';
import { RATE_LIMIT_TEXT } from './LoginScreen';

// KAN-59: phone + SMS code login, routing by registration status, logout with token revocation.
beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  localStorage.clear();
  signedOut();
  useToast.setState({ toasts: [] });
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  usePanelNav.getState().resetTo('login');
});

const screens = () => usePanelNav.getState().stack.map((r) => r.screen);
const top = () => screen.getByRole('main', { hidden: false });
const phoneField = () => screen.getByLabelText('شماره‌ی موبایل مدیر رستوران');

async function openAccount() {
  const tabs = await screen.findByRole('navigation', { name: 'بخش‌های رستوران' });
  await userEvent.click(within(tabs).getByRole('button', { name: 'حساب' }));
}

async function toCodeStep(phone = '09131234567') {
  render(<PanelShell />);
  await userEvent.type(await screen.findByLabelText('شماره‌ی موبایل مدیر رستوران'), phone);
  await userEvent.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }));
  return screen.findByLabelText('کد ۴ رقمی');
}

describe('phone step', () => {
  it('without a session the panel opens at login', async () => {
    render(<PanelShell />);
    expect(await screen.findByRole('heading', { name: 'ورود به پنل رستوران' })).toBeInTheDocument();
    expect(screens()).toEqual(['login']);
    expect(screen.queryByRole('navigation', { name: 'بخش‌های رستوران' })).toBeNull();
  });

  it('the button needs a valid 09… number; a wrong full number shows the error', async () => {
    render(<PanelShell />);
    const btn = await screen.findByRole('button', { name: 'دریافت کد تأیید' });
    expect(btn).toBeDisabled();
    await userEvent.type(phoneField(), '08123456789');
    expect(screen.getByText('شماره‌ی موبایل درست نیست')).toBeInTheDocument();
    expect(btn).toBeDisabled();
    await userEvent.clear(phoneField());
    await userEvent.type(phoneField(), '09123456789');
    expect(btn).toBeEnabled();
  });

  it('Persian digits are normalized before sending', async () => {
    let sent = '';
    server.use(
      http.post('*/v1/r/auth/otp/request', async ({ request }) => {
        sent = ((await request.json()) as { phone: string }).phone;
        return HttpResponse.json({ resendAfterSec: 120, codeLength: 4 });
      }),
    );
    await toCodeStep('۰۹۱۳۱۲۳۴۵۶۷');
    expect(sent).toBe('09131234567');
  });

  it('429 shows «چند دقیقه دیگر دوباره تلاش کنید» and stays on the number', async () => {
    server.use(
      http.post('*/v1/r/auth/otp/request', () =>
        HttpResponse.json({ code: 'RATE_LIMITED', message: 'x' }, { status: 429 }),
      ),
    );
    render(<PanelShell />);
    await userEvent.type(await screen.findByLabelText('شماره‌ی موبایل مدیر رستوران'), '09131234567');
    await userEvent.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(RATE_LIMIT_TEXT);
    expect(screen.queryByLabelText('کد ۴ رقمی')).toBeNull();
  });
});

describe('code step', () => {
  it('one-time-code field; a wrong code shows the server message and clears the field', async () => {
    const code = await toCodeStep();
    expect(code).toHaveAttribute('autocomplete', 'one-time-code');
    expect(screen.getByText(/به/)).toHaveTextContent('۰۹۱۳ ۱۲۳ ۴۵۶۷');
    await userEvent.type(code, '9999');
    expect(await screen.findByText('کد واردشده درست نیست')).toBeInTheDocument();
    expect(screen.getByLabelText('کد ۴ رقمی')).toHaveValue('');
    expect(usePanelSession.getState().accessToken).toBeNull();
  });

  it('«ویرایش شماره» and back return to the number; the same number does not send a new SMS', async () => {
    let requests = 0;
    server.use(
      http.post('*/v1/r/auth/otp/request', () => {
        requests += 1;
        return HttpResponse.json({ resendAfterSec: 120, codeLength: 4 });
      }),
    );
    await toCodeStep();
    await userEvent.click(screen.getByRole('button', { name: 'ویرایش شماره' }));
    expect(phoneField()).toHaveValue('۰۹۱۳۱۲۳۴۵۶۷');
    await userEvent.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }));
    await screen.findByLabelText('کد ۴ رقمی');
    expect(requests).toBe(1);
    expect(usePanelNav.getState().handleSystemBack()).toBe('intercepted');
    expect(await screen.findByLabelText('شماره‌ی موبایل مدیر رستوران')).toBeInTheDocument();
  });

  it('resend waits for the countdown', async () => {
    await toCodeStep();
    expect(screen.getByRole('button', { name: 'ارسال دوباره‌ی کد' })).toBeDisabled();
    expect(
      screen.getByText(/ارسال دوباره‌ی کد تا ۰۲:۰۰ دیگر|ارسال دوباره‌ی کد تا ۰۱:۵۹ دیگر/),
    ).toBeInTheDocument();
  });

  it('approved restaurant: code → shift → orders; back never returns to login', async () => {
    const code = await toCodeStep();
    await userEvent.type(code, '1234');
    expect(await screen.findByRole('button', { name: 'شروع شیفت و فعال‌سازی صدا' })).toBeInTheDocument();
    expect(screens()).toEqual(['shift']);
    expect(usePanelSession.getState()).toMatchObject({ status: 'active' });
    expect(usePanelSession.getState().accessToken).toMatch(/^r-access-/);
    await userEvent.click(screen.getByRole('button', { name: 'شروع شیفت و فعال‌سازی صدا' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' })).toBeInTheDocument();
    expect(screens()).toEqual(['orders']);
  });

  it('sends the device id (several devices may be signed in, D-96)', async () => {
    let deviceId: string | undefined;
    server.use(
      http.post('*/v1/r/auth/otp/verify', async ({ request }) => {
        deviceId = ((await request.json()) as { deviceId?: string }).deviceId;
        return HttpResponse.json({ accessToken: 'a', refreshToken: 'r', status: 'active' });
      }),
    );
    await userEvent.type(await toCodeStep(), '1234');
    await waitFor(() => expect(deviceId).toBeTruthy());
    expect(localStorage.getItem('dk-r-device')).toBe(deviceId);
  });
});

describe('routing by registration status', () => {
  it('pending → status page (no navigation), «بررسی دوباره» refetches', async () => {
    await userEvent.type(await toCodeStep('09130000001'), '1234');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'درخواست شما در حال بررسی است' }),
    ).toBeInTheDocument();
    expect(screens()).toEqual(['reg-status']);
    expect(screen.queryByRole('navigation', { name: 'بخش‌های رستوران' })).toBeNull();
    expect(screen.getByRole('button', { name: 'بررسی دوباره‌ی وضعیت' })).toBeInTheDocument();
  });

  it('needs_docs → lists the missing documents by their server labels', async () => {
    await userEvent.type(await toCodeStep('09130000002'), '1234');
    const list = await screen.findByRole('list', { name: 'مدارک لازم' });
    expect(within(list).getByText('مجوز کسب')).toBeInTheDocument();
  });

  it('rejected → shows the reason and «ثبت‌نام دوباره» opens the wizard', async () => {
    await userEvent.type(await toCodeStep('09130000003'), '1234');
    expect(await screen.findByRole('note')).toHaveTextContent('تصویر مجوز کسب خوانا نبود');
    await userEvent.click(screen.getByRole('button', { name: 'ثبت‌نام دوباره' }));
    expect(screens()).toEqual(['reg-status', 'reg']);
  });

  it('a phone without a restaurant goes to the registration wizard', async () => {
    await userEvent.type(await toCodeStep('09130000000'), '1234');
    await waitFor(() => expect(screens()).toEqual(['reg']));
  });

  it('a pending restaurant that got approved meanwhile goes straight to the shift', async () => {
    signedIn('pending', '09131234567', false);
    render(<PanelShell />);
    expect(await screen.findByRole('button', { name: 'شروع شیفت و فعال‌سازی صدا' })).toBeInTheDocument();
    expect(usePanelSession.getState().status).toBe('active');
  });
});

describe('register path', () => {
  it('«رستوران جدید هستم» verifies the phone first, with back to login', async () => {
    render(<PanelShell />);
    await userEvent.click(await screen.findByRole('button', { name: 'رستوران جدید هستم، ثبت‌نام می‌کنم' }));
    expect(within(top()).getByRole('heading', { name: 'ثبت‌نام رستوران جدید' })).toBeInTheDocument();
    await userEvent.click(within(top()).getByRole('button', { name: 'بازگشت' }));
    expect(screens()).toEqual(['login']);
  });

  it('an already active phone is simply signed in, with a toast', async () => {
    render(<PanelShell />);
    await userEvent.click(await screen.findByRole('button', { name: 'رستوران جدید هستم، ثبت‌نام می‌کنم' }));
    await userEvent.type(within(top()).getByLabelText('شماره‌ی موبایل مدیر رستوران'), '09131234567');
    await userEvent.click(within(top()).getByRole('button', { name: 'دریافت کد تأیید' }));
    await userEvent.type(await within(top()).findByLabelText('کد ۴ رقمی'), '1234');
    expect(await screen.findByRole('status')).toHaveTextContent('این شماره رستوران فعال دارد');
    expect(screens()).toEqual(['shift']);
  });
});

describe('session and logout', () => {
  it('a reload with a session starts at the shift screen (sound needs a new tap)', async () => {
    signedIn('active', '09131234567', false);
    render(<PanelShell />);
    expect(await screen.findByRole('button', { name: 'شروع شیفت و فعال‌سازی صدا' })).toBeInTheDocument();
  });

  it('logout asks first, revokes the token on the server and returns to login', async () => {
    let revoked = '';
    server.use(
      http.post('*/v1/r/auth/logout', ({ request }) => {
        revoked = request.headers.get('Authorization') ?? '';
        return new HttpResponse(null, { status: 204 });
      }),
    );
    signedIn();
    render(<PanelShell />);
    await openAccount();
    await userEvent.click(await screen.findByRole('button', { name: /خروج از حساب/ }));
    const dlg = screen.getByRole('alertdialog', { name: 'از حساب خارج می‌شوید؟' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'خروج' }));
    await waitFor(() => expect(screens()).toEqual(['login']));
    expect(revoked).toBe('Bearer r-access-0-09131234567');
    expect(usePanelSession.getState().accessToken).toBeNull();
    expect(localStorage.getItem('dk-r-session')).not.toContain('r-access');
  });

  it('logout still signs out locally when the server cannot be reached', async () => {
    server.use(http.post('*/v1/r/auth/logout', () => HttpResponse.error()));
    signedIn();
    render(<PanelShell />);
    await openAccount();
    await userEvent.click(await screen.findByRole('button', { name: /خروج از حساب/ }));
    await userEvent.click(screen.getByRole('button', { name: 'خروج' }));
    await waitFor(() => expect(screens()).toEqual(['login']));
    expect(usePanelSession.getState().accessToken).toBeNull();
  });
});
