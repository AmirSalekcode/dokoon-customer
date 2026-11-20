import { Capacitor } from '@capacitor/core';
import { installMockFetch } from '@/lib/mockFetch';
import { readStorage } from '@/lib/storage';
import { addIncomingOrder } from './db';
import { panelHandlers } from './handlers';
import { createMockStream, type MockStream } from './stream';

/** Demo: a new order every N ms (localStorage `dk-mock-neworder-ms`; default 90 s, 0 = off). */
const newOrderEveryMs = () => {
  const v = readStorage('dk-mock-neworder-ms');
  return v === null ? 90_000 : Math.max(0, Number(v) || 0);
};

export interface PanelMocks {
  mode: 'worker' | 'in-page';
  stream: MockStream;
  /** A new order on the server without a live event (as if it arrived during an outage). */
  addOrder: typeof addIncomingOrder;
  stop: () => void;
}

/**
 * Start the restaurant mock API (mock/demo builds only).
 * - Android app (Capacitor WebView) or no service worker: in-page fetch mocks (D-71).
 * - Browser: MSW service worker, falling back to in-page mocks if it cannot register.
 * The realtime stream is always in-page (a socket factory, see realtime/events.ts).
 */
export async function startPanelMocks(): Promise<PanelMocks> {
  const stream = createMockStream({ newOrderEveryMs: newOrderEveryMs() });
  const inPage = (): PanelMocks => {
    const uninstall = installMockFetch(panelHandlers);
    return {
      mode: 'in-page',
      stream,
      addOrder: addIncomingOrder,
      stop: () => {
        uninstall();
        stream.stop();
      },
    };
  };
  if (Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return inPage();
  try {
    const { setupWorker } = await import('msw/browser');
    const worker = setupWorker(...panelHandlers);
    await worker.start({
      onUnhandledFrame: 'bypass',
      quiet: true,
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    });
    return {
      mode: 'worker',
      stream,
      addOrder: addIncomingOrder,
      stop: () => {
        worker.stop();
        stream.stop();
      },
    };
  } catch (err) {
    console.warn('[panel mocks] service worker unavailable, using in-page mocks', err);
    return inPage();
  }
}
