import { App as CapApp } from '@capacitor/app';
import { isNative } from '@/lib/platform';
import { useNav } from './nav';

/**
 * Wires the platform back action to the nav stack:
 * - Android (Capacitor): hardware/gesture back → handleSystemBack; second press at root exits.
 * - Web/PWA: one "guard" history entry; popstate → handleSystemBack, then re-arm the guard.
 *   On 'exit' we step out of the guard so the browser leaves normally.
 */
export function initSystemBack(): () => void {
  if (isNative()) {
    const sub = CapApp.addListener('backButton', () => {
      if (useNav.getState().handleSystemBack() === 'exit') void CapApp.exitApp();
    });
    return () => void sub.then((h) => h.remove());
  }

  const GUARD = { dkGuard: true };
  history.pushState(GUARD, '');
  const onPop = () => {
    const res = useNav.getState().handleSystemBack();
    if (res === 'exit') {
      window.removeEventListener('popstate', onPop);
      history.back();
      return;
    }
    history.pushState(GUARD, '');
  };
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}

/** Network status → offline ErrorPage; reconnect auto-returns (screen-specs §5). */
export function initConnectivity(): () => void {
  const off = () => useNav.getState().showError('offline');
  const on = () => {
    const s = useNav.getState().stack;
    const top = s[s.length - 1];
    if (top?.screen === 'error' && top.params.kind === 'offline') useNav.getState().back();
  };
  window.addEventListener('offline', off);
  window.addEventListener('online', on);
  if (!navigator.onLine) off();
  return () => {
    window.removeEventListener('offline', off);
    window.removeEventListener('online', on);
  };
}
