import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '@/auth/session';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route, RouteParams, ScreenId } from '@/nav/types';
import { useToast } from '@/ui/toast';
import { ReportScreen } from '../order/ReportScreen';
import { AboutScreen } from './AboutScreen';
import { ApplyScreen } from './ApplyScreen';
import { InviteScreen } from './InviteScreen';
import { LegalScreen } from './LegalScreen';
import { RateAppScreen } from './RateAppScreen';
import { SocialScreen } from './SocialScreen';
import { SoonScreen } from './SoonScreen';
import { SupportScreen } from './SupportScreen';

const nav = () => useNav.getState();
const top = () => nav().stack.at(-1)!;
const open = (screen: ScreenId, params?: RouteParams): Route => {
  nav().push(screen, params);
  return top();
};
const toastText = () => useToast.getState().toasts[0]?.text;
const login = () =>
  useSession.getState().setSession({
    accessToken: 'a',
    refreshToken: 'r',
    user: { id: 'u1', phone: '09131234567', name: 'امیر' },
  });

beforeEach(() => {
  useSession.getState().clear();
  nav().resetTo('home');
});

describe('<SupportScreen /> — spec §6 support', () => {
  it('contacts are call/message links; FAQs expand', async () => {
    render(<SupportScreen route={open('support')} />);
    expect(await screen.findByRole('link', { name: 'تماس با تماس تلفنی با پشتیبانی' })).toHaveAttribute(
      'href',
      'tel:+983100000000',
    );
    const q = screen.getByRole('button', { name: 'چه زمانی می‌توانم سفارش را لغو کنم؟' });
    expect(q).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(q);
    expect(q).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/تا قبل از تأیید رستوران/)).toBeVisible();
  });

  it('message: guest → login; logged in → sent and cleared', async () => {
    let body: unknown;
    server.use(
      http.post('*/v1/support/messages', async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 201 });
      }),
    );
    render(<SupportScreen route={open('support')} />);
    const box = await screen.findByLabelText('پیام شما');
    await userEvent.type(box, 'سلام، سفارشم دیر رسید');
    await userEvent.click(screen.getByRole('button', { name: 'ارسال پیام' }));
    expect(top().screen).toBe('login');
    nav().back();
    login();
    await userEvent.click(screen.getByRole('button', { name: 'ارسال پیام' }));
    await waitFor(() => expect(toastText()).toBe('پیام شما ارسال شد'));
    expect(body).toEqual({ text: 'سلام، سفارشم دیر رسید' });
    expect(box).toHaveValue('');
  });
});

describe('<InviteScreen /> — spec §6 invite', () => {
  it('guest is asked to log in', async () => {
    render(<InviteScreen route={open('invite')} />);
    await userEvent.click(screen.getByRole('button', { name: 'ورود یا ثبت‌نام' }));
    expect(top().screen).toBe('login');
  });

  it('shows the code; copy and share', async () => {
    login();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    render(<InviteScreen route={open('invite')} />);
    expect(await screen.findByText('DOKOON-AMIR')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'کپی کد دعوت' }));
    expect(writeText).toHaveBeenCalledWith('DOKOON-AMIR');
    expect(screen.getByRole('button', { name: 'کپی شد' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'ارسال برای دوستان' }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://dokoonapp.ir/i/DOKOON-AMIR' }),
    );
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });
});

describe('<SocialScreen /> — spec §6 social', () => {
  it('lists channels; «دنبال کردن» opens the link outside the app', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<SocialScreen route={open('social')} />);
    await userEvent.click(await screen.findByRole('button', { name: 'دنبال کردن تلگرام' }));
    expect(openSpy).toHaveBeenCalledWith('https://t.me/dokoon_app', '_blank', 'noopener,noreferrer');
    openSpy.mockRestore();
  });
});

describe('<RateAppScreen /> — spec §6 rateapp', () => {
  it('stars required; thanks after sending', async () => {
    login();
    let body: { text?: string } = {};
    server.use(
      http.post('*/v1/support/messages', async ({ request }) => {
        body = (await request.json()) as { text?: string };
        return new HttpResponse(null, { status: 201 });
      }),
    );
    render(<RateAppScreen route={open('rateapp')} />);
    const send = screen.getByRole('button', { name: 'ثبت امتیاز' });
    expect(send).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: '۵ ستاره' }));
    await userEvent.type(screen.getByLabelText('نظر یا پیشنهاد شما (اختیاری)'), 'عالیه');
    await userEvent.click(send);
    expect(await screen.findByRole('heading', { name: 'ممنون از امتیاز شما' })).toBeInTheDocument();
    expect(body.text).toContain('امتیاز به اپ: ۵ از ۵');
    expect(body.text).toContain('عالیه');
  });
});

describe('<AboutScreen /> + <LegalScreen /> — spec §6 about / legal', () => {
  it('about text, version, links to terms / privacy / social / rateapp', async () => {
    render(<AboutScreen route={open('about')} />);
    expect(await screen.findByText(/سفارش آنلاین غذا از رستوران‌ها/)).toBeInTheDocument();
    expect(screen.getByText(/نسخه‌ی ۰٫۱٫۰/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^قوانین و مقررات/ }));
    expect(top()).toMatchObject({ screen: 'legal', params: { kind: 'terms' } });
    nav().back();
    await userEvent.click(screen.getByRole('button', { name: /^حریم خصوصی/ }));
    expect(top()).toMatchObject({ screen: 'legal', params: { kind: 'privacy' } });
  });

  it('legal text is split into expandable sections and marked as a draft', async () => {
    render(<LegalScreen route={open('legal', { kind: 'privacy' })} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'حریم خصوصی' })).toBeInTheDocument();
    expect(await screen.findByText(/متن پیش‌نویس/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { expanded: false }).map((b) => b.textContent)).toEqual([
      'اطلاعاتی که جمع می‌کنیم',
      'نحوه‌ی استفاده',
      'اشتراک‌گذاری',
    ]);
    expect(screen.getByText(/متن پیش‌نویس/)).toBeInTheDocument();
  });
});

describe('<ApplyScreen /> — spec §6 apply', () => {
  it('restaurant: all fields + valid mobile → POST /partner-requests → success → back', async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post('*/v1/partner-requests', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 201 });
      }),
    );
    render(<ApplyScreen route={open('apply', { kind: 'restaurant' })} />);
    expect(screen.getByRole('heading', { level: 1, name: 'ثبت‌نام رستوران' })).toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'ثبت درخواست' });
    await userEvent.type(screen.getByLabelText('نام رستوران'), 'کافه نارنج');
    await userEvent.type(screen.getByLabelText('نام مالک'), 'سارا احمدی');
    await userEvent.type(screen.getByLabelText('شماره‌ی تماس'), '0912');
    await userEvent.type(screen.getByLabelText('آدرس رستوران'), 'شهرضا، خیابان امام');
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByLabelText('شماره‌ی تماس'), '۱۲۳۴۵۶۷');
    await userEvent.click(send);
    expect(await screen.findByRole('heading', { name: 'درخواست شما ثبت شد' })).toBeInTheDocument();
    expect(body).toEqual({
      kind: 'restaurant',
      name: 'سارا احمدی',
      phone: '09121234567',
      cityId: 'shahreza',
      extra: { business: 'کافه نارنج', address: 'شهرضا، خیابان امام' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'بازگشت' }));
    expect(top().screen).toBe('home');
  });

  it('courier form has its own fields', () => {
    render(<ApplyScreen route={open('apply', { kind: 'courier' })} />);
    expect(screen.getByRole('heading', { level: 1, name: 'همکاری با پیک' })).toBeInTheDocument();
    expect(screen.getByLabelText('نوع وسیله‌ی نقلیه')).toBeInTheDocument();
    expect(screen.getByLabelText('محدوده‌ی فعالیت')).toBeInTheDocument();
  });
});

describe('report photo (POST /uploads) — spec §4 report', () => {
  it('an optional photo is uploaded and sent as photoUploadIds', async () => {
    login();
    let body: Record<string, unknown> = {};
    let uploadType = '';
    server.use(
      // jsdom + MSW cannot stream a multipart body into the handler (it aborts), so the default mock
      // (which parses the file) is covered by e2e/more.spec.ts in a real browser instead.
      http.post('*/v1/uploads', ({ request }) => {
        uploadType = request.headers.get('content-type') ?? '';
        return HttpResponse.json({ id: 'up7', url: 'mock-upload://up7' }, { status: 201 });
      }),
      http.post('*/v1/orders/o1/report', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 201 });
      }),
    );
    nav().push('track', { orderId: 'o1' });
    render(<ReportScreen route={open('report', { orderId: 'o1' })} />);
    await userEvent.click(screen.getByRole('radio', { name: 'غذا کامل نبود' }));
    await userEvent.type(screen.getByLabelText('توضیح مشکل'), 'نوشابه نبود');
    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('افزودن عکس (اختیاری)'), file);
    const photos = await screen.findByRole('list', { name: 'عکس‌ها' });
    expect(within(photos).getAllByRole('listitem')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'ثبت گزارش' }));
    await waitFor(() => expect(top().screen).toBe('track'));
    expect(toastText()).toBe('گزارش شما ثبت شد');
    expect(uploadType).toMatch(/^multipart\/form-data; boundary=/);
    expect(body).toMatchObject({
      typeId: 'missing',
      text: 'نوشابه نبود',
      photoUploadIds: [expect.stringMatching(/^up\d+$/)],
    });
  });

  it('a too-large file is rejected before upload', async () => {
    login();
    render(<ReportScreen route={open('report', { orderId: 'o1' })} />);
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('افزودن عکس (اختیاری)'), big);
    expect(await screen.findByRole('alert')).toHaveTextContent('حجم عکس باید کمتر از ۵ مگابایت باشد');
  });
});

describe('<SoonScreen /> — spec §6 soon', () => {
  it('shows the coming-soon message; «بازگشت» returns to the previous screen', async () => {
    nav().push('account');
    render(<SoonScreen route={open('soon', { title: 'کیف پول' })} />);
    expect(screen.getByRole('heading', { name: 'کیف پول' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'به‌زودی در دکون' })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'بازگشت' }).at(-1)!);
    expect(top().screen).toBe('account');
  });
});
