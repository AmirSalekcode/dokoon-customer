import { useNav } from './nav';
import type { RouteParams, ScreenId } from './types';

/**
 * Shared links (restaurant «اشتراک‌گذاری»): `/?restaurant=<id>`.
 * Captured once at boot, then opened on top of Home as soon as the user reaches Home
 * (returning users right after the splash; new users after onboarding + city).
 * Home stays underneath so back returns to Home, as for any other entry.
 */
let pending: { screen: ScreenId; params: RouteParams } | null = null;

const ID = /^[\w-]{1,64}$/;

export const restaurantLink = (id: string) => `${location.origin}/?restaurant=${encodeURIComponent(id)}`;

export function captureDeepLink(loc: Location = window.location) {
  const q = new URLSearchParams(loc.search);
  const id = q.get('restaurant');
  if (id === null) return;
  if (ID.test(id)) pending = { screen: 'restaurant', params: { restaurantId: id } };
  q.delete('restaurant');
  const rest = q.toString();
  history.replaceState(history.state, '', `${loc.pathname}${rest ? `?${rest}` : ''}${loc.hash}`);
}

/** Replace the splash/onboarding/city screen with `screen`; on Home, open a pending shared link. */
export function enterBootScreen(screen: ScreenId) {
  const nav = useNav.getState();
  nav.setTop(screen);
  if (screen === 'home' && pending) {
    const p = pending;
    pending = null;
    nav.push(p.screen, p.params);
  }
}
