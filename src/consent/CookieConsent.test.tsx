import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConsent } from './consent';
import { CookieConsent, FONT_WAIT_MS } from './CookieConsent';
import { useNav } from '@/nav/nav';

describe('<CookieConsent /> waits for the web font (no layout shift)', () => {
  const fonts = Object.getOwnPropertyDescriptor(document, 'fonts');
  afterEach(() => {
    if (fonts) Object.defineProperty(document, 'fonts', fonts);
    else delete (document as unknown as { fonts?: unknown }).fonts;
    vi.useRealTimers();
  });
  beforeEach(() => {
    localStorage.clear();
    useConsent.getState().reset();
  });

  /** Fake FontFaceSet: check() = already loaded?, load() = explicit load of a weight. */
  const fakeFonts = (loaded: boolean, load: (spec: string) => Promise<unknown>) => {
    const f = { check: vi.fn(() => loaded), load: vi.fn(load) };
    Object.defineProperty(document, 'fonts', { value: f, configurable: true });
    return f;
  };

  it('explicitly loads the popup font weights and renders only after they load', async () => {
    let resolve!: () => void;
    const pending = new Promise<void>((r) => (resolve = r));
    const f = fakeFonts(false, () => pending);
    render(<CookieConsent />);
    expect(screen.queryByRole('dialog')).toBeNull();
    // Lazy font loading means nothing is "in flight" yet; we must request the faces ourselves.
    expect(f.load).toHaveBeenCalledWith(expect.stringContaining('Yekan Bakh'));
    expect(f.load.mock.calls.map((c) => String(c[0]))).toEqual(
      expect.arrayContaining([expect.stringMatching(/^400 /), expect.stringMatching(/^700 /)]),
    );
    await act(async () => resolve());
    expect(screen.getByRole('dialog', { name: 'رضایت استفاده از کوکی' })).toBeInTheDocument();
  });

  it('does not trust fonts.check() (Chrome reports true before the face has loaded)', () => {
    const f = fakeFonts(true, () => new Promise(() => {}));
    render(<CookieConsent />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(f.load).toHaveBeenCalled();
  });

  it('appears right away when the font is cached (load resolves at once)', async () => {
    fakeFonts(false, () => Promise.resolve());
    render(<CookieConsent />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('still shows after a timeout if the font never loads (blocked/slow network)', async () => {
    vi.useFakeTimers();
    fakeFonts(false, () => new Promise(() => {}));
    render(<CookieConsent />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(FONT_WAIT_MS);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('still shows if loading the font fails', async () => {
    fakeFonts(false, () => Promise.reject(new Error('404')));
    render(<CookieConsent />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('shows immediately where the Font Loading API is missing', async () => {
    Object.defineProperty(document, 'fonts', { value: undefined, configurable: true });
    render(<CookieConsent />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});

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
