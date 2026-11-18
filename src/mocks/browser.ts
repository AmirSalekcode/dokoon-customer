import { Capacitor } from '@capacitor/core';
import { installInPageMocks } from './inPage';

/**
 * Start the mock API (mock/demo builds only).
 * - Android app (Capacitor WebView): in-page mocks; the MSW service worker is not reliable there.
 * - Browser: MSW service worker; if it cannot register (embedded browser, blocked SW), fall back
 *   to in-page mocks so the demo still works.
 */
export async function startMockWorker(): Promise<void> {
  if (Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) {
    installInPageMocks();
    return;
  }
  try {
    const [{ setupWorker }, { handlers }] = await Promise.all([import('msw/browser'), import('./handlers')]);
    await setupWorker(...handlers).start({
      onUnhandledFrame: 'bypass',
      quiet: true,
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    });
  } catch (err) {
    console.warn('[mocks] service worker unavailable, using in-page mocks', err);
    installInPageMocks();
  }
}
