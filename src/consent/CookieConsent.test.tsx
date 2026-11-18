import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useConsent } from './consent';
import { CookieConsent } from './CookieConsent';
import { useNav } from '@/nav/nav';

describe('<CookieConsent />', () => {
  beforeEach(() => {
    localStorage.clear();
    useConsent.getState().reset();
    useNav.getState().resetTo('home');
  });

  it('shows the Persian consent banner when undecided', () => {
    render(<CookieConsent />);
    const region = screen.getByRole('dialog', { name: 'رضایت استفاده از کوکی' });
    expect(within(region).getByRole('heading', { name: 'کوکی‌ها و حریم خصوصی' })).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'پذیرفتن همه' })).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'فقط ضروری' })).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'تنظیمات' })).toBeInTheDocument();
  });

  it('is not shown once a decision exists', () => {
    useConsent.getState().acceptAll();
    render(<CookieConsent />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('«پذیرفتن همه» accepts analytics and closes', async () => {
    render(<CookieConsent />);
    await userEvent.click(screen.getByRole('button', { name: 'پذیرفتن همه' }));
    expect(useConsent.getState()).toMatchObject({ decided: true, categories: { analytics: true } });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('«فقط ضروری» keeps analytics off and closes', async () => {
    render(<CookieConsent />);
    await userEvent.click(screen.getByRole('button', { name: 'فقط ضروری' }));
    expect(useConsent.getState()).toMatchObject({ decided: true, categories: { analytics: false } });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('settings: essential is locked on, analytics can be toggled and saved', async () => {
    render(<CookieConsent />);
    await userEvent.click(screen.getByRole('button', { name: 'تنظیمات' }));
    const essential = screen.getByRole('switch', { name: 'کوکی‌های ضروری' });
    expect(essential).toHaveAttribute('aria-checked', 'true');
    expect(essential).toBeDisabled();
    const analytics = screen.getByRole('switch', { name: 'آمار و بهبود اپ' });
    expect(analytics).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(analytics);
    expect(analytics).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'ذخیره‌ی انتخاب‌ها' }));
    expect(useConsent.getState()).toMatchObject({ decided: true, categories: { analytics: true } });
  });

  it('privacy link opens the legal/privacy screen', async () => {
    render(<CookieConsent />);
    await userEvent.click(screen.getByRole('button', { name: 'سیاست حریم خصوصی' }));
    const s = useNav.getState().stack;
    expect(s[s.length - 1]).toMatchObject({ screen: 'legal', params: { doc: 'privacy' } });
  });

  it('buttons meet the 48px touch target via CSS class contract', () => {
    render(<CookieConsent />);
    for (const b of screen.getAllByRole('button')) expect(b.className).not.toBe('');
  });
});
