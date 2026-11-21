import { App as CapApp } from '@capacitor/app';
import { isNative } from '@/lib/platform';
import { usePanelSession } from '../api/session';
import { isPanelTab, usePanelNav, type PanelScreen } from '../nav/nav';
import { WIDE_QUERY } from '../orders/hooks';
import { useOrdersUi } from '../state/ordersUi';
import { useShift } from '../state/shift';

/**
 * Restaurant Android app (KAN-71). Its WebView may play sound without a tap (MainActivity turns off
 * `mediaPlaybackRequiresUserGesture`), so the browser-only «شروع شیفت» gesture screen is skipped.
 */
export const canAutoStartShift = (): boolean => isNative();

/** Deep-link scheme = the package id (strings.xml custom_url_scheme, AndroidManifest intent-filter). */
export const PANEL_SCHEME = 'ir.dokoonapp.restaurant';

export type PanelLink =
  | { screen: 'orders' }
  | { screen: 'order'; id: string }
  | { screen: Exclude<PanelScreen, 'order' | 'orders'> };

/** Screens a link may open (signed-in screens only; never login/registration/error). */
const LINKABLE: readonly PanelScreen[] = ['orders', 'menu', 'reports', 'account', 'notifs', 'sound', 'help'];

/**
 * `ir.dokoonapp.restaurant://order/<id>` → that order; `…://orders|menu|reports|account|notifs|sound|help`.
 * Also accepts the same paths on https://panel.dokoonapp.ir. Anything else → null (ignored).
 */
export function parsePanelLink(url: string): PanelLink | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const scheme = u.protocol.replace(/:$/, '');
  let parts: string[];
  if (scheme === PANEL_SCHEME) parts = [u.hostname, ...u.pathname.split('/')];
  else if (scheme === 'https' && u.hostname === 'panel.dokoonapp.ir') parts = u.pathname.split('/');
  else return null;
  parts = parts.filter(Boolean).map((p) => decodeURIComponent(p));
  const [head, id] = parts;
  if (head === 'order' && id && /^[\w-]{1,64}$/.test(id) && parts.length === 2)
    return { screen: 'order', id };
  if (head && parts.length === 1 && LINKABLE.includes(head as PanelScreen))
    return { screen: head } as PanelLink;
  return null;
}

/** Open a parsed link; ignored until signed in with a started shift (boot routing handles the rest). */
export function openPanelLink(link: PanelLink): boolean {
  if (!usePanelSession.getState().accessToken || !useShift.getState().started) return false;
  const nav = usePanelNav.getState();
  if (link.screen === 'order') {
    useOrdersUi.getState().select(link.id);
    nav.resetTo('orders');
    const wide = typeof window !== 'undefined' && !!window.matchMedia?.(WIDE_QUERY).matches;
    if (!wide) usePanelNav.getState().push('order', { id: link.id });
    return true;
  }
  if (isPanelTab(link.screen)) nav.resetTo(link.screen);
  else {
    // Account sub-screens open on top of their tab, so back returns to «حساب» (exact back).
    nav.resetTo('account');
    usePanelNav.getState().push(link.screen);
  }
  return true;
}

/** Android: links that open the app (cold start or while running). No-op on the web. */
export function initPanelDeepLinks(): () => void {
  if (!isNative()) return () => {};
  const sub = CapApp.addListener('appUrlOpen', ({ url }) => {
    const link = parsePanelLink(url);
    if (link) openPanelLink(link);
  });
  return () => void sub.then((h) => h.remove());
}
