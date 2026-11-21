import type { Middleware } from 'openapi-fetch';

function newKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Insecure contexts lack randomUUID: build a v4 UUID from getRandomValues.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Adds `Idempotency-Key` to the POSTs whose contract path matches `paths`. The same action (method + URL +
 * body) keeps its key until the server gives a definite answer (< 500), so a retry after a timeout, network
 * loss or 5xx can never apply an action twice; a new tap after a definite answer gets a fresh key.
 * Shared by the restaurant panel (contract-notes 23) and the courier app (contract-notes 30).
 */
export function idempotencyMiddleware(paths: RegExp): Middleware {
  const pending = new Map<string, string>();
  const byRequest = new Map<string, string>();
  return {
    async onRequest({ request, schemaPath, id }) {
      if (request.method !== 'POST' || !paths.test(schemaPath)) return undefined;
      const sig = `${request.url} ${await request.clone().text()}`;
      const key = pending.get(sig) ?? newKey();
      pending.set(sig, key);
      byRequest.set(id, sig);
      request.headers.set('Idempotency-Key', key);
      return request;
    },
    onResponse({ response, id }) {
      const sig = byRequest.get(id);
      byRequest.delete(id);
      if (sig && response.status < 500) pending.delete(sig);
      return undefined;
    },
    onError({ id }) {
      // Network failure / timeout / 5xx thrown by the HTTP layer: keep the key for the retry.
      byRequest.delete(id);
      return undefined;
    },
  };
}
