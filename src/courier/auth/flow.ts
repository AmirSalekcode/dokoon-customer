import { ApiError } from '@/api/errors';
import { isNative } from '@/lib/platform';
import { courierApi, signOut, type CourierApi } from '../api/client';
import { isMarkedSignedOut, useCourierSession } from '../api/session';
import type { CourierStatus, Me } from '../api/types';
import { showFullPageError } from '../errors/fullPage';
import { useCourierNav, type CourierScreen } from '../nav/nav';

/**
 * Courier sign-in routing (KAN-90, courier screen specs «ورود»): after the code, `Me.status` decides —
 * no account yet → registration, pending / suspended → the waiting page, approved → the orders tab
 * (the device-permissions step joins in front of it in KAN-92). The stack is replaced each time, so back
 * never returns to the login or waiting page.
 */
export function routeFor(status: CourierStatus | null | undefined): CourierScreen {
  if (status === 'approved') return 'orders';
  if (status === 'pending' || status === 'suspended') return 'wait';
  return 'reg';
}

/** Keep the profile from verify / `GET /c/me` in memory. */
export function applyMe(me: Me): CourierStatus {
  const status = (me.status ?? 'new') as CourierStatus;
  useCourierSession.getState().setSession({ status, name: me.name ?? '' });
  return status;
}

/**
 * Open the screen for a status. `keepErrors`: full-page errors raised while starting (e.g. offline) stay on
 * top, so «تلاش دوباره» lands on the right screen.
 */
export function enter(status: CourierStatus | null, { keepErrors = false } = {}) {
  const nav = useCourierNav.getState();
  const errors = keepErrors ? nav.stack.filter((r) => r.screen === 'error') : [];
  nav.resetTo(routeFor(status));
  for (const e of errors) useCourierNav.getState().push('error', e.params);
}

export function toLogin() {
  useCourierNav.getState().resetTo('login');
}

/**
 * First screen. The web session is an HttpOnly cookie the page cannot see, so `GET /c/me` tells whether it
 * is still valid (`401` → login, quietly). The app asks only when the Keystore holds a token. Offline or a
 * server error shows its full page above the boot screen; «تلاش دوباره» runs this again.
 */
export async function bootCourier(api: CourierApi = courierApi()): Promise<void> {
  if (isMarkedSignedOut() || (isNative() && !useCourierSession.getState().accessToken)) {
    toLogin();
    return;
  }
  try {
    const { data } = await api.GET('/c/me');
    if (!data) {
      toLogin();
      return;
    }
    enter(applyMe(data));
  } catch (e) {
    if (e instanceof ApiError && e.kind === 'e401') {
      // No (or an expired) session: the login page, not the «session expired» page.
      useCourierSession.getState().clear();
      toLogin();
      return;
    }
    if (!showFullPageError(e, () => void bootCourier(api))) toLogin();
  }
}

/** «خروج» (account tab, waiting page) and the e401 page's «ورود دوباره». */
export function signOutToLogin() {
  signOut();
  toLogin();
}
