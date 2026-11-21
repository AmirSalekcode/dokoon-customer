import { Capacitor } from '@capacitor/core';
import { installMockFetch } from '@/lib/mockFetch';
import { readStorage } from '@/lib/storage';
import { courierHandlers } from './handlers';
import { createCourierMockStream, type CourierMockStream } from './stream';

/** Demo: a new offer every N ms (localStorage `dkc-mock-offer-ms`; default 45 s, 0 = off). */
const newOfferEveryMs = () => {
  const v = readStorage('dkc-mock-offer-ms');
  return v === null ? 45_000 : Math.max(0, Number(v) || 0);
};

export interface CourierMocks {
  mode: 'worker' | 'in-page';
  stream: CourierMockStream;
  stop: () => void;
}

/**
 * Start the courier mock API (mock/demo builds only).
 * - Android app (Capacitor WebView) or no service worker: in-page fetch mocks (D-71).
 * - Browser: MSW service worker, falling back to in-page mocks if it cannot register.
 * The realtime stream is always in-page (a socket factory).
 */
export async function startCourierMocks(): Promise<CourierMocks> {
  const stream = createCourierMockStream({ newOfferEveryMs: newOfferEveryMs() });
  const inPage = (): CourierMocks => {
    const uninstall = installMockFetch(courierHandlers);
    return {
      mode: 'in-page',
      stream,
      stop: () => {
        uninstall();
        stream.stop();
      },
    };
  };
  if (Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return inPage();
  try {
    const { setupWorker } = await import('msw/browser');
    const worker = setupWorker(...courierHandlers);
    await worker.start({
      onUnhandledFrame: 'bypass',
      quiet: true,
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    });
    return {
      mode: 'worker',
      stream,
      stop: () => {
        worker.stop();
        stream.stop();
      },
    };
  } catch (err) {
    console.warn('[courier mocks] service worker unavailable, using in-page mocks', err);
    return inPage();
  }
}
