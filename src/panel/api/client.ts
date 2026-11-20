import createClient from 'openapi-fetch';
import { createHttp, type HttpOptions } from '@/api/http';
import { apiBaseUrl } from '@/lib/apiBase';
import type { paths } from './schema';
import { idempotencyMiddleware } from './idempotency';
import { usePanelSession } from './session';
import type { RestaurantAuth } from './types';

const refreshing = new Map<string, Promise<boolean>>();

/** Rotating refresh (POST /r/auth/refresh returns a new pair). One refresh at a time per API. */
function refreshTokens(baseUrl: string, fetchImpl: typeof fetch): Promise<boolean> {
  const running = refreshing.get(baseUrl);
  if (running) return running;
  const run = (async () => {
    const { refreshToken, setSession, clear } = usePanelSession.getState();
    if (!refreshToken) return false;
    try {
      const res = await fetchImpl(`${baseUrl}/r/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        // Revoked or expired: the e401 page then sends the user to login.
        clear();
        return false;
      }
      const body = (await res.json()) as RestaurantAuth;
      if (!body.accessToken || !body.refreshToken) return false;
      setSession({ accessToken: body.accessToken, refreshToken: body.refreshToken, status: body.status });
      return true;
    } catch {
      return false;
    } finally {
      refreshing.delete(baseUrl);
    }
  })();
  refreshing.set(baseUrl, run);
  return run;
}

/** Typed restaurant client (restaurant contract) on the shared HTTP layer: timeout, retry, error kinds. */
export function createPanelApi(
  baseUrl = apiBaseUrl(),
  opts: Pick<HttpOptions, 'retries' | 'fetchImpl' | 'isOnline'> = {},
) {
  const raw: typeof fetch = opts.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
  const client = createClient<paths>({
    baseUrl,
    fetch: createHttp({
      ...opts,
      getAccessToken: () => usePanelSession.getState().accessToken,
      onUnauthorized: () => refreshTokens(baseUrl, raw),
    }),
  });
  client.use(idempotencyMiddleware());
  return client;
}

export type PanelApi = ReturnType<typeof createPanelApi>;

let shared: PanelApi | null = null;
/** The app-wide client, created on first use (after mocks/config are ready). */
export const panelApi = (): PanelApi => (shared ??= createPanelApi());

export type OrderAction = 'accept' | 'reject' | 'ready' | 'handover' | 'extend';
interface ActionBody {
  accept: { prepMinutes: number };
  reject: { reasonId: string };
  extend: { addMinutes: number };
  ready: undefined;
  handover: undefined;
}

/** Order state change (idempotent). 409 (`ALREADY_ANSWERED`, invalid transition) comes back as `error`. */
export function orderAction<A extends OrderAction>(
  api: PanelApi,
  id: string,
  action: A,
  body?: ActionBody[A],
) {
  const params = { path: { id } };
  switch (action) {
    case 'accept':
      return api.POST('/r/orders/{id}/accept', { params, body: body as ActionBody['accept'] });
    case 'reject':
      return api.POST('/r/orders/{id}/reject', { params, body: body as ActionBody['reject'] });
    case 'extend':
      return api.POST('/r/orders/{id}/extend', { params, body: body as ActionBody['extend'] });
    case 'ready':
      return api.POST('/r/orders/{id}/ready', { params });
    default:
      return api.POST('/r/orders/{id}/handover', { params });
  }
}
