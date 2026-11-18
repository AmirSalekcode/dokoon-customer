import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLaunch } from '@/auth/flow';
import { useSession } from '@/auth/session';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { useToast } from '@/ui/toast';
import { CityScreen } from './CityScreen';
import { OnboardScreen, ONBOARDING } from './OnboardScreen';
import { SPLASH_MAX_MS, SPLASH_MIN_MS, SplashScreen } from './SplashScreen';

const route = (screen: Route['screen'], params: Record<string, string> = {}): Route => ({
  key: 'k',
  screen,
  params,
});

/** Add only navigator.geolocation (replacing navigator would drop onLine and break fetch). */
const geoDesc = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
const stubPosition = (latitude: number, longitude: number) =>
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude, longitude } }) },
  });
const restorePosition = () => {
  if (geoDesc) Object.defineProperty(navigator, 'geolocation', geoDesc);
  else delete (navigator as unknown as { geolocation?: unknown }).geolocation;
};

const stack = () => useNav.getState().stack.map((r) => r.screen);

beforeEach(() => {
  localStorage.clear();
  useLaunch.getState().reset();
  useSession.getState().clear();
});

describe('<SplashScreen />', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the logo, tagline and version, then goes to onboarding on first launch', async () => {
    vi.useFakeTimers();
    useNav.getState().resetTo('splash');
    render(<SplashScreen route={route('splash')} />);
    expect(screen.getByRole('img', { name: 'دکون' })).toBeInTheDocument();
    expect(screen.getByText('غذای محبوبت، دم در خونه‌ات')).toBeInTheDocument();
    expect(screen.getByText(/^نسخه /)).toBeInTheDocument();
    expect(stack()).toEqual(['splash']);
    await act(async () => {
      vi.advanceTimersByTime(SPLASH_MIN_MS);
    });
    expect(stack()).toEqual(['onboard']);
  });

  it('returning user (onboarding done, city chosen) goes straight home — no login needed', async () => {
    vi.useFakeTimers();
    useLaunch.getState().finishOnboarding();
    useLaunch.getState().setCity('shahreza');
    useNav.getState().resetTo('splash');
    render(<SplashScreen route={route('splash')} />);
    await act(async () => {
      vi.advanceTimersByTime(SPLASH_MIN_MS);
    });
    expect(stack()).toEqual(['home']);
  });

  it('decision D-61: stays at least SPLASH_MIN_MS (brand), leaves as soon as the app is ready', async () => {
    vi.useFakeTimers();
    useNav.getState().resetTo('splash');
    render(<SplashScreen route={route('splash')} />);
    await act(async () => {
      vi.advanceTimersByTime(SPLASH_MIN_MS - 1);
    });
    expect(stack()).toEqual(['splash']);
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(stack()).toEqual(['onboard']);
    expect(SPLASH_MIN_MS).toBe(1200); // owner: exactly 2× the earlier 0.6s
  });

  it('waits for a slow session check, but never longer than SPLASH_MAX_MS', async () => {
    vi.useFakeTimers();
    server.use(http.get('*/v1/me', () => new Promise<Response>(() => {})));
    useSession.getState().setSession({ accessToken: 'a', refreshToken: 'r' });
    useNav.getState().resetTo('splash');
    render(<SplashScreen route={route('splash')} />);
    await act(async () => {
      vi.advanceTimersByTime(SPLASH_MIN_MS);
    });
    expect(stack()).toEqual(['splash']);
    await act(async () => {
      vi.advanceTimersByTime(SPLASH_MAX_MS - SPLASH_MIN_MS);
    });
    expect(stack()).toEqual(['onboard']);
    expect(SPLASH_MAX_MS).toBe(1800);
  });

  it('checks a stored session; an expired one is cleared silently (user continues as guest)', async () => {
    server.use(http.get('*/v1/me', () => new HttpResponse(null, { status: 401 })));
    server.use(http.post('*/v1/auth/refresh', () => new HttpResponse(null, { status: 401 })));
    useSession.getState().setSession({ accessToken: 'old', refreshToken: 'old' });
    useNav.getState().resetTo('splash');
    render(<SplashScreen route={route('splash')} />);
    await waitFor(() => expect(useSession.getState().accessToken).toBeNull());
    expect(stack()).not.toContain('error');
  });
});

describe('<OnboardScreen />', () => {
  beforeEach(() => useNav.getState().resetTo('onboard'));

  it('shows the first slide and moves through all slides', async () => {
    render(<OnboardScreen route={route('onboard')} />);
    expect(screen.getByRole('heading', { name: ONBOARDING[0].title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'بعدی' }));
    expect(screen.getByRole('heading', { name: ONBOARDING[1].title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'بعدی' }));
    expect(screen.getByRole('heading', { name: ONBOARDING[2].title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'شروع کنیم' })).toBeInTheDocument();
    expect(screen.getByText('۳ از ۳')).toBeInTheDocument();
  });

  it('«رد کردن» finishes onboarding (remembered) and opens city selection', async () => {
    render(<OnboardScreen route={route('onboard')} />);
    await userEvent.click(screen.getByRole('button', { name: 'رد کردن' }));
    expect(useLaunch.getState().seenOnboarding).toBe(true);
    expect(stack()).toEqual(['city']);
  });

  it('the last slide CTA also finishes onboarding', async () => {
    render(<OnboardScreen route={route('onboard')} />);
    await userEvent.click(screen.getByRole('button', { name: 'بعدی' }));
    await userEvent.click(screen.getByRole('button', { name: 'بعدی' }));
    await userEvent.click(screen.getByRole('button', { name: 'شروع کنیم' }));
    expect(stack()).toEqual(['city']);
  });
});

describe('<CityScreen />', () => {
  beforeEach(() => useNav.getState().resetTo('city'));

  it('lists active cities from the API; the only city is preselected', async () => {
    render(<CityScreen route={route('city')} />);
    const shahreza = await screen.findByRole('radio', { name: 'شهرضا' });
    expect(shahreza).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'تأیید و ادامه' })).toBeEnabled();
  });

  it('confirm saves the city and opens home (launch flow)', async () => {
    render(<CityScreen route={route('city')} />);
    await screen.findByRole('radio', { name: 'شهرضا' });
    await userEvent.click(screen.getByRole('button', { name: 'تأیید و ادامه' }));
    expect(useLaunch.getState().cityId).toBe('shahreza');
    expect(stack()).toEqual(['home']);
  });

  it('opened from settings: has a back button and confirm returns to settings', async () => {
    useNav.getState().resetTo('settings');
    useNav.getState().push('city', { from: 'settings' });
    render(<CityScreen route={route('city', { from: 'settings' })} />);
    expect(screen.getByRole('button', { name: 'بازگشت' })).toBeInTheDocument();
    await screen.findByRole('radio', { name: 'شهرضا' });
    await userEvent.click(screen.getByRole('button', { name: 'تأیید و ادامه' }));
    expect(stack()).toEqual(['settings']);
  });

  it('no back button in the launch flow (nothing to go back to)', async () => {
    render(<CityScreen route={route('city')} />);
    await screen.findByRole('radio', { name: 'شهرضا' });
    expect(screen.queryByRole('button', { name: 'بازگشت' })).toBeNull();
  });

  it('confirm is disabled until a city is chosen when several cities exist', async () => {
    server.use(
      http.get('*/v1/cities', () =>
        HttpResponse.json([
          { id: 'shahreza', name: 'شهرضا' },
          { id: 'nain', name: 'نایین' },
        ]),
      ),
    );
    render(<CityScreen route={route('city')} />);
    await screen.findByRole('radio', { name: 'نایین' });
    expect(screen.getByRole('button', { name: 'تأیید و ادامه' })).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: 'نایین' }));
    expect(screen.getByRole('button', { name: 'تأیید و ادامه' })).toBeEnabled();
  });

  it('«موقعیت من» picks the city from the service zone', async () => {
    server.use(
      http.get('*/v1/cities', () =>
        HttpResponse.json([
          { id: 'shahreza', name: 'شهرضا' },
          { id: 'nain', name: 'نایین' },
        ]),
      ),
    );
    stubPosition(32.0089, 51.8668);
    render(<CityScreen route={route('city')} />);
    await screen.findByRole('radio', { name: 'نایین' });
    await userEvent.click(screen.getByRole('button', { name: 'تشخیص خودکار با موقعیت من' }));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'شهرضا' })).toHaveAttribute('aria-checked', 'true'),
    );
    restorePosition();
  });

  it('location outside the service zone shows a message and selects nothing', async () => {
    stubPosition(35.7, 51.4);
    server.use(
      http.get('*/v1/cities', () =>
        HttpResponse.json([
          { id: 'shahreza', name: 'شهرضا' },
          { id: 'nain', name: 'نایین' },
        ]),
      ),
    );
    render(<CityScreen route={route('city')} />);
    await screen.findByRole('radio', { name: 'نایین' });
    await userEvent.click(screen.getByRole('button', { name: 'تشخیص خودکار با موقعیت من' }));
    await waitFor(() =>
      expect(useToast.getState().toasts[0]?.text).toBe(
        'دکون هنوز در موقعیت شما فعال نیست. شهر را از فهرست انتخاب کنید.',
      ),
    );
    restorePosition();
  });

  it('error loading cities shows a retry', async () => {
    server.use(
      http.get('*/v1/cities', () => HttpResponse.json({ code: 'X', message: 'x' }, { status: 400 })),
    );
    render(<CityScreen route={route('city')} />);
    expect(await screen.findByRole('button', { name: 'تلاش دوباره' })).toBeInTheDocument();
  });
});
