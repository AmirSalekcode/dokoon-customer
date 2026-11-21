import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { createFakePushProvider } from '@/providers/push/fakePush';
import { useToast } from '@/ui/toast';
import { createPanelApi } from '../../api/client';
import { db } from '../../mocks/db';
import { panelHandlers, resetPanelMockDb } from '../../mocks/handlers';
import { usePanelNav } from '../../nav/nav';
import { enablePanelPush } from '../../push/panelPush';
import { useLive } from '../../realtime/live';
import { PanelShell } from '../../shell/PanelShell';
import { useNotifs } from '../../state/notifs';
import { useOrders } from '../../state/orders';
import { useRestaurant } from '../../state/restaurant';
import { signedIn, signedOut, testStream } from '../../test/session';
import { docsOrder } from './InfoScreen';

// KAN-70: restaurant info, Sheba change, notifications, help, support message, panel push.
beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  localStorage.clear();
  useToast.setState({ toasts: [] });
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  useOrders.getState().reset();
  useNotifs.getState().reset();
  usePanelNav.getState().resetTo('login');
});
afterEach(() => signedOut());

const route = () => usePanelNav.getState().stack.at(-1)!;
const toastText = () => useToast.getState().toasts[0]?.text;
const top = () => document.querySelector<HTMLElement>('main:not([hidden])')!;
// A valid (mod-97) Sheba.
const SHEBA = 'IR062960000000100324200001';

async function openAccount() {
  signedIn();
  render(<PanelShell />);
  await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' });
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'حساب' }));
  await screen.findByRole('heading', { level: 2, name: 'کبابی سنتی زاگرس' });
  return user;
}
const open = async (user: ReturnType<typeof userEvent.setup>, row: RegExp) => {
  await user.click(screen.getByRole('button', { name: row }));
};

describe('restaurant info', () => {
  it('edits name and address with PATCH /r/me; the header shows the new name', async () => {
    const user = await openAccount();
    await open(user, /اطلاعات رستوران/);
    const name = await within(top()).findByLabelText('نام رستوران');
    await user.clear(name);
    await user.type(name, 'کبابی زاگرس ۲');
    await user.click(screen.getByRole('button', { name: 'ذخیره‌ی اطلاعات' }));
    await waitFor(() => expect(route().screen).toBe('account'));
    expect(db.profile.name).toBe('کبابی زاگرس ۲');
    expect(screen.getByRole('heading', { level: 1, name: 'کبابی زاگرس ۲' })).toBeInTheDocument();
  });

  it('a short address shows an inline error and is not sent', async () => {
    const user = await openAccount();
    await open(user, /اطلاعات رستوران/);
    const addr = await within(top()).findByLabelText('آدرس');
    await user.clear(addr);
    await user.type(addr, 'کوتاه');
    await user.click(screen.getByRole('button', { name: 'ذخیره‌ی اطلاعات' }));
    expect(screen.getByText('آدرس حداقل ۸ حرف است')).toBeInTheDocument();
    expect(db.profile.address).not.toBe('کوتاه');
  });

  it('newly required documents are listed first with a notice', async () => {
    server.use(
      http.get('*/v1/r/doc-types', () =>
        HttpResponse.json([
          {
            id: 'lic',
            label: 'مجوز کسب',
            required: true,
            uploaded: true,
            accept: ['application/pdf'],
            maxMb: 10,
          },
          {
            id: 'health',
            label: 'کارت بهداشت',
            required: true,
            stage: 'later',
            accept: ['image/jpeg'],
            maxMb: 5,
            uploaded: false,
          },
        ]),
      ),
    );
    const user = await openAccount();
    await open(user, /اطلاعات رستوران/);
    expect(await screen.findByText(/دکون مدرک تازه‌ای لازم دارد: .*کارت بهداشت/)).toBeInTheDocument();
    expect(
      docsOrder([
        { id: 'a', required: false },
        { id: 'b', required: true, uploaded: false },
      ]).map((d) => d.id),
    ).toEqual(['b', 'a']);
  });
});

describe('Sheba change', () => {
  it('new Sheba + fresh SMS code → request pending review', async () => {
    const user = await openAccount();
    await open(user, /اطلاعات رستوران/);
    await user.click(await screen.findByRole('button', { name: 'درخواست تغییر شبا' }));
    expect(route().screen).toBe('sheba');
    const send = screen.getByRole('button', { name: 'ارسال کد تأیید' });
    expect(send).toBeDisabled();
    await user.type(within(top()).getByLabelText('شماره‌ی شبای تازه'), SHEBA);
    await user.type(within(top()).getByLabelText('شماره‌ی موبایل مدیر'), '09131234567');
    await user.click(send);
    const code = await within(top()).findByLabelText('کد تأیید پیامکی');
    await user.type(code, '9999');
    await user.click(screen.getByRole('button', { name: 'ثبت درخواست تغییر شبا' }));
    expect(await screen.findByText('کد واردشده درست نیست')).toBeInTheDocument();
    await user.clear(code);
    await user.type(code, '1234');
    await user.click(screen.getByRole('button', { name: 'ثبت درخواست تغییر شبا' }));
    await waitFor(() => expect(route().screen).toBe('info'));
    expect(db.profile.pendingShebaChange).toBe(true);
    expect(screen.getByRole('button', { name: 'تغییر شبا در حال بررسی است' })).toBeDisabled();
  });

  it('a wrong checksum is caught before sending', async () => {
    const user = await openAccount();
    await open(user, /اطلاعات رستوران/);
    await user.click(await screen.findByRole('button', { name: 'درخواست تغییر شبا' }));
    await user.type(within(top()).getByLabelText('شماره‌ی شبای تازه'), 'IR062960000000100324200002');
    expect(screen.getByText('شماره‌ی شبا درست نیست؛ دوباره بررسی کنید')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ارسال کد تأیید' })).toBeDisabled();
  });
});

describe('notifications', () => {
  it('unread count on the account row; tap reads one; «خواندن همه» reads all', async () => {
    const user = await openAccount();
    expect(await screen.findByRole('button', { name: /اعلان‌ها.*۲ پیام خوانده‌نشده/ })).toBeInTheDocument();
    await open(user, /اعلان‌ها/);
    await user.click(await screen.findByRole('button', { name: /واریز هفتگی انجام شد/ }));
    await waitFor(() => expect(db.notifications.find((n) => n.id === 'n1')?.unread).toBe(false));
    expect(db.notifications.find((n) => n.id === 'n2')?.unread).toBe(true);
    await user.click(screen.getByRole('button', { name: 'خواندن همه' }));
    await waitFor(() => expect(db.notifications.every((n) => !n.unread)).toBe(true));
    expect(screen.queryByRole('button', { name: 'خواندن همه' })).not.toBeInTheDocument();
  });

  it('empty list', async () => {
    db.notifications = [];
    const user = await openAccount();
    await open(user, /اعلان‌ها/);
    expect(await screen.findByText('اعلانی نیست')).toBeInTheDocument();
  });

  it('a live notification is added and toasted', async () => {
    const user = await openAccount();
    await open(user, /اعلان‌ها/);
    await screen.findByRole('button', { name: /واریز هفتگی انجام شد/ });
    await waitFor(() => expect(useLive.getState().status).toBe('open'));
    act(() =>
      testStream.emit({
        event: 'notification.created',
        data: {
          id: 'n9',
          title: 'پاسخ پشتیبانی',
          text: 'مشکل حل شد',
          createdAt: new Date().toISOString(),
          unread: true,
        },
      }),
    );
    expect(await screen.findByRole('button', { name: /پاسخ پشتیبانی/ })).toBeInTheDocument();
    expect(toastText()).toBe('پیام تازه از دکون: پاسخ پشتیبانی');
  });
});

describe('help and support message', () => {
  it('FAQ opens; a message needs a subject and 10+ letters, then is sent', async () => {
    const user = await openAccount();
    await open(user, /راهنما و پشتیبانی/);
    const q = screen.getByRole('button', { name: 'چطور سفارش را قبول کنم؟' });
    await user.click(q);
    expect(q).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'ارسال پیام به پشتیبانی' }));
    expect(route().screen).toBe('ticket');
    await user.type(within(top()).getByLabelText('توضیح مشکل یا درخواست'), 'کوتاه');
    await user.click(screen.getByRole('button', { name: 'ارسال پیام' }));
    expect(screen.getByText('موضوع پیام را انتخاب کنید')).toBeInTheDocument();
    expect(screen.getByText('حداقل ۱۰ حرف بنویسید')).toBeInTheDocument();

    let sent: unknown = null;
    server.use(
      http.post('*/v1/r/support/messages', async ({ request }) => {
        sent = await request.json();
        return new HttpResponse(null, { status: 201 });
      }),
    );
    await user.click(screen.getByRole('button', { name: 'تسویه' }));
    await user.type(within(top()).getByLabelText('توضیح مشکل یا درخواست'), ' واریز این هفته نرسیده');
    await user.click(screen.getByRole('button', { name: 'ارسال پیام' }));
    await waitFor(() => expect(route().screen).toBe('help'));
    expect(sent).toEqual({ category: 'settle', text: 'کوتاه واریز این هفته نرسیده' });
    expect(toastText()).toBe('پیام شما فرستاده شد؛ پاسخ در اعلان‌ها می‌آید');
  });
});

describe('panel push (PushProvider)', () => {
  it('asks permission and registers the token; denied stays off', async () => {
    let body: unknown = null;
    server.use(
      http.post('http://panel.test/v1/r/push/subscribe', async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const api = createPanelApi('http://panel.test/v1', { retries: 0 });
    expect(await enablePanelPush(createFakePushProvider(), api)).toBe('on');
    expect(body).toEqual({ provider: 'fake:other', token: 'fake-token' });
    expect(await enablePanelPush(createFakePushProvider('denied'), api)).toBe('denied');
  });
});
