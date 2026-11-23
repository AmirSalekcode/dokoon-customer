import { ApiError } from '@/api/errors';
import { isNative } from '@/lib/platform';
import { courierApi, signOut, type CourierApi } from '../api/client';
import { isMarkedSignedOut, useCourierSession } from '../api/session';
import type { CourierStatus, Me } from '../api/types';
import { showFullPageError } from '../errors/fullPage';
import { useCourierNav, type CourierScreen } from '../nav/nav';
import { canWork, checkAll } from '../permissions/provider';
import { useActiveOrder } from '../state/active';
import { useOffers } from '../state/offers';
import { useOnline } from '../state/online';

/**
 * Courier sign-in routing (KAN-90, courier screen specs «ورود»): after the code, `Me.status` decides —
 * no account yet → registration, pending / suspended → the waiting page, approved → the orders tab, with
 * the device-permissions page in front of it while location or notifications are missing (KAN-92). The
 * stack is replaced each time, so back never returns to the login or waiting page.
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

/** Approved couriers go through the permissions page until location and notifications are allowed. */
export async function screenFor(status: CourierStatus | null): Promise<CourierScreen> {
  const screen = routeFor(status);
  if (screen !== 'orders') return screen;
  return canWork(await checkAll()) ? 'orders' : 'perm';
}

/**
 * Open the screen for a status. `keepErrors`: full-page errors raised while starting (e.g. offline) stay on
 * top, so «تلاش دوباره» lands on the right screen.
 */
export async function enter(status: CourierStatus | null, { keepErrors = false } = {}): Promise<void> {
  const screen = await screenFor(status);
  const nav = useCourierNav.getState();
  const errors = keepErrors ? nav.stack.filter((r) => r.screen === 'error') : [];
  nav.resetTo(screen, screen === 'perm' ? { first: '1' } : {});
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
    await enter(applyMe(data));
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
  // Tracking ends with the session; the server is told when it is still listed as online (best effort).
  const { online, hasActive } = useOnline.getState();
  if (online && !hasActive) void courierApi().PUT('/c/status', { body: { online: false } }).catch(() => {});
  useOnline.getState().reset();
  useOffers.getState().clear();
  useActiveOrder.getState().clear();
  signOut();
  toLogin();
}
