import createClient from 'openapi-fetch';
import { createHttp, type HttpOptions } from '@/api/http';
import { idempotencyMiddleware } from '@/api/idempotency';
import { apiBaseUrl } from '@/lib/apiBase';
import { isNative } from '@/lib/platform';
import type { paths } from './schema';
import { markSignedOut, useCourierSession } from './session';
import type { CourierStatus, VerifyResult } from './types';

/**
 * Which client is calling (contract-notes 30): the server sets the HttpOnly session cookie for
 * `courier-web` and returns the token in the verify body only for `courier-android`. A custom header
 * also makes every cross-site write need a CORS preflight (CSRF guard next to SameSite).
 */
export const CLIENT_HEADER = 'X-Dokoon-Client';
export const clientKind = (): 'courier-android' | 'courier-web' =>
  isNative() ? 'courier-android' : 'courier-web';

/** Offer and order actions that must be safe to retry (Idempotency-Key, contract-notes 30). */
const IDEMPOTENT =
  /^\/c\/(offers\/\{id\}\/(accept|reject)|orders\/\{id\}\/(stage|withdraw|issue|unreachable|deliver))$/;

/** A wrong OTP is `401` in the courier contract; it stays on the login screen (contract-notes 37). */
const inlineStatus = (status: number, request: Request) =>
  status === 401 && new URL(request.url).pathname.endsWith('/c/auth/verify');

/**
 * Typed courier client (courier contract) on the shared HTTP layer: timeout, GET retry, error kinds
 * (offline / 401 → login / 403 / 404 / 5xx pages). The contract has no refresh endpoint yet
 * (contract-notes 32), so a 401 ends the session and raises the e401 page.
 */
export function createCourierApi(
  baseUrl = apiBaseUrl(),
  opts: Pick<HttpOptions, 'retries' | 'fetchImpl' | 'isOnline' | 'timeoutMs'> = {},
) {
  const client = createClient<paths>({
    baseUrl,
    credentials: 'include',
    headers: { [CLIENT_HEADER]: clientKind() },
    fetch: createHttp({
      ...opts,
      getAccessToken: () => useCourierSession.getState().accessToken,
      onUnauthorized: async () => {
        useCourierSession.getState().clear();
        return false;
      },
      inlineStatus,
    }),
  });
  client.use(idempotencyMiddleware(IDEMPOTENT));
  return client;
}

export type CourierApi = ReturnType<typeof createCourierApi>;

let shared: CourierApi | null = null;
/** The app-wide client, created on first use (after mocks/config are ready). */
export const courierApi = (): CourierApi => (shared ??= createCourierApi());

/**
 * OTP verify → session. The app keeps the returned token in the Keystore; the web keeps nothing (its
 * session is the cookie the same response set). `error` (wrong code 401, 429) is for the screen.
 */
export async function verifyOtp(api: CourierApi, phone: string, code: string) {
  const res = await api.POST('/c/auth/verify', { body: { phone, code } });
  if (res.data) {
    const data = res.data as VerifyResult;
    useCourierSession.getState().setSession({
      accessToken: data.accessToken ?? null,
      status: (data.status ?? 'new') as CourierStatus,
      name: data.name ?? '',
    });
    markSignedOut(false);
  }
  return res;
}

/**
 * Sign out on this device. There is no logout endpoint yet (contract-notes 32): the app forgets its token;
 * on the web the HttpOnly cookie can only be cleared by the server, so it lives until it expires — the
 * signed-out mark keeps the next start on the login page instead of silently reusing that cookie.
 */
export function signOut(): void {
  useCourierSession.getState().clear();
  markSignedOut(true);
}

export type OfferAction = 'accept' | 'reject';

/** Atomic offer answer (first courier wins). `409` = taken or expired → `isOfferGone(error)`. */
export function offerAction(api: CourierApi, id: string, action: OfferAction) {
  const params = { path: { id } };
  return action === 'accept'
    ? api.POST('/c/offers/{id}/accept', { params })
    : api.POST('/c/offers/{id}/reject', { params });
}
