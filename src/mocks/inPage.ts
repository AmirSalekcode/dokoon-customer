import { getResponse } from 'msw';
import { handlers } from './handlers';

/**
 * Mock API without a service worker: wraps window.fetch and answers same-origin `/api/v1/*`
 * requests from the MSW handlers in the page itself. Used inside the Android app (Capacitor's
 * WebView does not run the MSW worker reliably) and as a fallback when the worker cannot register.
 * Mock/demo builds only — production never loads this module.
 */
export function installInPageMocks(): () => void {
  const original = globalThis.fetch;
  const real = original.bind(globalThis);
  const patched: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/v1/')) return real(input, init);
    const response = await getResponse(handlers, request);
    return (
      response ??
      new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'mock: no handler' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  };
  globalThis.fetch = patched;
  return () => {
    if (globalThis.fetch === patched) globalThis.fetch = original;
  };
}
