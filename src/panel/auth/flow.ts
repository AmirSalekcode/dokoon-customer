import { readStorage, writeStorage } from '@/lib/storage';
import { toast } from '@/ui/toast';
import { panelApi, type PanelApi } from '../api/client';
import { usePanelSession } from '../api/session';
import type { RestaurantAuth, RestaurantStatus } from '../api/types';
import { usePanelNav, type PanelScreen } from '../nav/nav';
import { useRestaurant } from '../state/restaurant';
import { endShift, useShift } from '../state/shift';

/**
 * Restaurant sign-in flow (KAN-59, restaurant screen specs §1):
 * login (phone → code) → `shift` when the restaurant is approved, `reg-status` while it is pending /
 * rejected / needs documents, the registration wizard when the phone has no restaurant yet.
 * Several devices may be signed in at once (D-96).
 */

/** `new` = no restaurant for this phone yet: proposed for the contract (contract-notes 26). */
export type AuthStatus = RestaurantStatus | 'new';

const REVIEW: readonly string[] = ['pending', 'needs_docs', 'rejected'];

/** Where an authenticated manager lands. */
export function routeFor(status: AuthStatus | null | undefined): PanelScreen {
  if (status === 'active') return useShift.getState().started ? 'orders' : 'shift';
  if (status && REVIEW.includes(status)) return 'reg-status';
  return 'reg';
}

/** Stable per-install id sent with OTP verify (server binds refresh tokens / push to devices). */
export function panelDeviceId(): string {
  let id = readStorage('dk-r-device');
  if (!id) {
    id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `d-${Date.now().toString(36)}`;
    writeStorage('dk-r-device', id);
  }
  return id;
}

/** Store the tokens and open the right screen (the stack is replaced: back never returns to login). */
export function completeSignIn(auth: RestaurantAuth, mode: 'login' | 'register' = 'login') {
  if (!auth.accessToken || !auth.refreshToken) return;
  const status = (auth.status ?? null) as AuthStatus | null;
  usePanelSession.getState().setSession({
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    status: status as RestaurantStatus | null,
  });
  enter(status);
  if (mode === 'register' && status === 'active')
    toast('این شماره رستوران فعال دارد؛ وارد پنل شدید', 'info', 2600);
}

/**
 * Open the screen for a (new or refreshed) registration status. `keepErrors`: full-page errors that
 * appeared while starting (e.g. offline) stay on top of it, so «تلاش دوباره» lands on the right screen.
 */
export function enter(status: AuthStatus | null, { keepErrors = false } = {}) {
  const screen = routeFor(status);
  const nav = usePanelNav.getState();
  const errors = keepErrors ? nav.stack.filter((r) => r.screen === 'error') : [];
  if (status === 'active') void useRestaurant.getState().load();
  nav.resetTo(screen);
  for (const e of errors) usePanelNav.getState().push('error', e.params);
}

/** First screen after the startup config check. */
export function bootPanel() {
  const { accessToken, status } = usePanelSession.getState();
  if (!accessToken) {
    const nav = usePanelNav.getState();
    const errors = nav.stack.filter((r) => r.screen === 'error');
    nav.resetTo('login');
    for (const e of errors) usePanelNav.getState().push('error', e.params);
    return;
  }
  // A session from before statuses were stored counts as active; its requests then 401/403 properly.
  enter((status as AuthStatus | null) ?? 'active', { keepErrors: true });
}

/** Forget this device's session locally (also the e401 page's «ورود دوباره»). */
export function signOutLocal() {
  usePanelSession.getState().clear();
  endShift();
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  usePanelNav.getState().resetTo('login');
}

/** «خروج»: revoke the tokens on the server (best effort), then sign out locally. */
export async function logout(api: PanelApi = panelApi()) {
  try {
    if (usePanelSession.getState().accessToken) await api.POST('/r/auth/logout');
  } catch {
    // Offline or already revoked: the local session is cleared anyway.
  }
  signOutLocal();
}
