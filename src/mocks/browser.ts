import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Starts the MSW service worker in the browser (mock mode only). */
export async function startMockWorker(): Promise<void> {
  const worker = setupWorker(...handlers);
  await worker.start({
    onUnhandledFrame: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}
