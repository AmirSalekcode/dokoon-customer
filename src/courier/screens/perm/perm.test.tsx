import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToast } from '@/ui/toast';
import { CourierApp } from '../../CourierApp';
import { useCourierNav } from '../../nav/nav';
import {
  canWork,
  checkAll,
  isSatisfied,
  setPermissionProvider,
  webPermissionProvider,
} from '../../permissions/provider';
import { fakePermissions } from '../../test/permissions';

// KAN-92 (CP-08): device permissions — location + notifications required, battery recommended (Android),
// denied / unsupported states, iOS PWA note, entry from the account tab.
const nav = () => useCourierNav.getState();
const screens = () => nav().stack.map((r) => r.screen);
const top = () => document.querySelector<HTMLElement>('main:not([hidden])')!;
const card = (name: string) => within(top()).getByRole('region', { name });
const cont = () => within(top()).getByRole('button', { name: 'ادامه' });
const webOnly = ['location', 'notifications'] as const;

beforeEach(() => {
  useToast.setState({ toasts: [] });
});
afterEach(() => {
  setPermissionProvider(webPermissionProvider);
  vi.restoreAllMocks();
});

function openFirst() {
  act(() => nav().resetTo('perm', { first: '1' }));
  render(<CourierApp />);
}

describe('rules', () => {
  it('location must be granted; notifications granted or impossible on this device', () => {
    expect(isSatisfied('location', 'granted')).toBe(true);
    expect(isSatisfied('location', 'unsupported')).toBe(false);
    expect(isSatisfied('notifications', 'unsupported')).toBe(true);
    expect(isSatisfied('notifications', 'denied')).toBe(false);
    expect(canWork({ location: 'granted', notifications: 'granted', battery: 'prompt' })).toBe(true);
    expect(canWork({ location: 'granted', notifications: 'prompt', battery: 'granted' })).toBe(false);
  });

  it('kinds the platform cannot ask for are unsupported', async () => {
    const p = fakePermissions({ location: 'granted', notifications: 'granted' }, {}, webOnly);
    expect(await checkAll(p)).toEqual({ location: 'granted', notifications: 'granted', battery: 'unsupported' });
  });
});

describe('first visit (after approval)', () => {
  it('«ادامه» waits for location and notifications; battery is optional', async () => {
    const p = fakePermissions();
    setPermissionProvider(p);
    openFirst();
    expect(await within(top()).findByRole('region', { name: /موقعیت مکانی/ })).toBeInTheDocument();
    expect(within(top()).queryByRole('button', { name: 'بازگشت' })).toBeNull();
    expect(cont()).toBeDisabled();
    await userEvent.click(within(card('موقعیت مکانی (همیشه)')).getByRole('button', { name: 'اجازه می‌دهم' }));
    expect(cont()).toBeDisabled();
    await userEvent.click(within(card('اعلان‌ها')).getByRole('button', { name: 'اجازه می‌دهم' }));
    await waitFor(() => expect(cont()).toBeEnabled());
    expect(within(card('عدم محدودیت باتری')).getByText('لازم است')).toBeInTheDocument();
    expect(p.asked).toEqual(['location', 'notifications']);
    await userEvent.click(cont());
    expect(screens()).toEqual(['orders']);
  });

  it('a denied permission explains how to open it and keeps «ادامه» disabled', async () => {
    setPermissionProvider(fakePermissions({ notifications: 'granted' }, { location: 'denied' }));
    openFirst();
    const loc = await within(top()).findByRole('region', { name: /موقعیت مکانی/ });
    await userEvent.click(within(loc).getByRole('button', { name: 'اجازه می‌دهم' }));
    await waitFor(() => expect(within(loc).getByText(/اجازه بسته شده است/)).toBeInTheDocument());
    expect(
      useToast
        .getState()
        .toasts.map((t) => t.text)
        .join(),
    ).toMatch(/اجازه بسته شده است/);
    expect(cont()).toBeDisabled();
  });

  it('returning from the system settings re-reads the states', async () => {
    const p = fakePermissions({ location: 'denied', notifications: 'granted' });
    setPermissionProvider(p);
    openFirst();
    await within(top()).findByRole('region', { name: /موقعیت مکانی/ });
    expect(cont()).toBeDisabled();
    p.states.location = 'granted';
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(cont()).toBeEnabled());
  });

  it('web: no battery card; a browser without notifications may continue with a note', async () => {
    setPermissionProvider(fakePermissions({ location: 'granted', notifications: 'unsupported' }, {}, webOnly));
    openFirst();
    expect(await within(top()).findByText(/این مرورگر اعلان ندارد/)).toBeInTheDocument();
    expect(within(top()).getByRole('region', { name: 'موقعیت مکانی' })).toBeInTheDocument();
    expect(within(top()).queryByRole('region', { name: 'اعلان‌ها' })).toBeNull();
    expect(within(top()).queryByRole('region', { name: 'عدم محدودیت باتری' })).toBeNull();
    expect(cont()).toBeEnabled();
  });

  it('iPhone: says background location is missing and recommends Android', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
    );
    setPermissionProvider(fakePermissions({ location: 'granted', notifications: 'unsupported' }, {}, webOnly));
    openFirst();
    expect(await within(top()).findByText(/موقعیت پس‌زمینه ندارد/)).toBeInTheDocument();
    expect(within(top()).getByText(/افزودن به صفحه‌ی اصلی/)).toBeInTheDocument();
  });
});

describe('from the account tab', () => {
  it('opens as a normal page with back and no «ادامه»', async () => {
    setPermissionProvider(fakePermissions({ location: 'granted', notifications: 'granted' }));
    act(() => nav().resetTo('account'));
    render(<CourierApp />);
    await userEvent.click(screen.getByRole('button', { name: /مجوزهای دستگاه/ }));
    expect(screens()).toEqual(['account', 'perm']);
    expect(await within(top()).findByRole('region', { name: /موقعیت مکانی/ })).toHaveTextContent('فعال');
    expect(within(top()).queryByRole('button', { name: 'ادامه' })).toBeNull();
    await userEvent.click(within(top()).getByRole('button', { name: 'بازگشت' }));
    expect(screens()).toEqual(['account']);
  });
});

describe('web provider', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
    vi.unstubAllGlobals();
  });

  it('maps the browser APIs: no geolocation → unsupported, Notification «default» → prompt', async () => {
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: () => Promise.resolve('granted'),
    });
    expect(await webPermissionProvider.check('location')).toBe('unsupported');
    expect(await webPermissionProvider.check('notifications')).toBe('prompt');
    expect(await webPermissionProvider.request('notifications')).toBe('granted');
    expect(await webPermissionProvider.check('battery')).toBe('unsupported');
  });

  it('asking for location: a position → granted, PERMISSION_DENIED → denied', async () => {
    let fail = false;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (ok: () => void, err: (e: { code: number; PERMISSION_DENIED: number }) => void) =>
          fail ? err({ code: 1, PERMISSION_DENIED: 1 }) : ok(),
      },
    });
    expect(await webPermissionProvider.request('location')).toBe('granted');
    fail = true;
    expect(await webPermissionProvider.request('location')).toBe('denied');
  });
});
