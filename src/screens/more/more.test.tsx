import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '@/auth/session';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route, RouteParams, ScreenId } from '@/nav/types';
import { useToast } from '@/ui/toast';
import { InviteScreen } from './InviteScreen';
import { RateAppScreen } from './RateAppScreen';
import { SocialScreen } from './SocialScreen';
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
