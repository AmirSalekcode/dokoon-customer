import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { ApiError } from '@/api/errors';
import { setSecureBackend, type SecureBackend } from '@/lib/secureStore';
import { courierHandlers, resetCourierMockDb } from '../mocks/handlers';
import * as platform from '@/lib/platform';
import { CLIENT_HEADER, createCourierApi, offerAction, signOut, verifyOtp } from './client';
import { businessError, hasActiveOrder, isOfferGone } from './errors';
import { COURIER_SESSION_KEY, hydrateCourierSession, useCourierSession } from './session';

// KAN-86: courier API client — cookie session on the web, Keystore token in the app, error mapping
// (401/403/404/409/503/offline), Idempotency-Key on offer and order actions.
const BASE = 'http://courier.test/v1';
const api = (retries?: number) => createCourierApi(BASE, retries === undefined ? {} : { retries });
const url = (p: string) => `${BASE}${p}`;

/** In-memory Keystore stand-in. */
function fakeKeystore() {
  const store = new Map<string, string>();
  const backend: SecureBackend = {
    native: true,
    get: async (k) => store.get(k) ?? null,
    set: (k, v) => void (v === null ? store.delete(k) : store.set(k, v)),
  };
  return { store, backend };
}

function asApp(on: boolean) {
  vi.spyOn(platform, 'isNative').mockReturnValue(on);
  const ks = fakeKeystore();
  setSecureBackend(on ? ks.backend : null);
  return ks;
}

beforeEach(() => {
  server.use(...courierHandlers);
  resetCourierMockDb();
});
afterEach(() => {
  useCourierSession.setState({ accessToken: null, status: null });
  setSecureBackend(null);
  vi.restoreAllMocks();
});

describe('web session: HttpOnly cookie, nothing in localStorage', () => {
  it('sends credentials and the client header; keeps no token after sign-in', async () => {
    asApp(false);
    let seen: { credentials?: string; client?: string | null; auth?: string | null } = {};
    // Checked where the request leaves the client (Node's fetch drops `credentials` before MSW sees it).
    const fetchImpl: typeof fetch = (input, init) => {
      const request = new Request(input, init);
      seen = {
        credentials: request.credentials,
        client: request.headers.get(CLIENT_HEADER),
        auth: request.headers.get('Authorization'),
      };
      return globalThis.fetch(request);
    };
    server.use(
      http.post(url('/c/auth/verify'), () => {
        return HttpResponse.json(
          { name: 'مهدی', status: 'approved', accessToken: 'leaked' },
          { headers: { 'Set-Cookie': 'dkc_session=c-1-09131234567; HttpOnly' } },
        );
      }),
    );
    const { data } = await verifyOtp(createCourierApi(BASE, { fetchImpl }), '09131234567', '1234');
    expect(data?.status).toBe('approved');
    expect(seen).toEqual({ credentials: 'include', client: 'courier-web', auth: null });
    // Even a token the server wrongly put in the body is not kept on the web.
    expect(useCourierSession.getState()).toMatchObject({ accessToken: null, status: 'approved' });
    expect(localStorage.length).toBe(0);
    expect(JSON.stringify({ ...localStorage })).not.toContain('c-1');
  });

  it('a wrong code (401 in the contract) stays on the login screen as an inline error', async () => {
    asApp(false);
    const res = await verifyOtp(api(), '09131234567', '0000');
    expect(res.response.status).toBe(401);
    expect(businessError(res.error)).toEqual({ code: 'OTP_INVALID', message: 'کد واردشده درست نیست' });
    expect(useCourierSession.getState().status).toBeNull();
  });
});

describe('app session: Keystore token', () => {
  it('stores the token from verify in the Keystore only, sends it as bearer, and hydrates it', async () => {
    const ks = asApp(true);
    await verifyOtp(api(), '09131234567', '1234');
    const token = useCourierSession.getState().accessToken;
    expect(token).toMatch(/^c-\d+-09131234567$/);
    expect(JSON.parse(ks.store.get(COURIER_SESSION_KEY)!)).toEqual({ accessToken: token });
    expect(localStorage.length).toBe(0);

    let auth: string | null = null;
    let client: string | null = null;
    server.use(
      http.get(url('/c/me'), ({ request }) => {
        auth = request.headers.get('Authorization');
        client = request.headers.get(CLIENT_HEADER);
        return HttpResponse.json({ name: 'مهدی', status: 'approved' });
      }),
    );
    await api().GET('/c/me');
    expect(auth).toBe(`Bearer ${token}`);
    expect(client).toBe('courier-android');

    useCourierSession.setState({ accessToken: null });
    await hydrateCourierSession();
    expect(useCourierSession.getState().accessToken).toBe(token);

    signOut();
    expect(useCourierSession.getState().accessToken).toBeNull();
    expect(JSON.parse(ks.store.get(COURIER_SESSION_KEY)!)).toEqual({ accessToken: null });
  });

  it('a phone without an account comes back as status new (→ registration)', async () => {
    asApp(true);
    await verifyOtp(api(), '09120000001', '1234');
    expect(useCourierSession.getState().status).toBe('new');
  });
});

describe('full-page error kinds', () => {
  it('401 on a signed-in call ends the session and raises the e401 page (→ login), no refresh', async () => {
    asApp(true);
    useCourierSession.getState().setSession({ accessToken: 'revoked', status: 'approved' });
    const calls: string[] = [];
    server.use(
      http.all(url('/c/*'), ({ request }) => {
        calls.push(new URL(request.url).pathname);
        return HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 });
      }),
    );
    const e = await api()
      .GET('/c/me')
      .catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).kind).toBe('e401');
    expect(calls).toEqual(['/v1/c/me']); // no invented refresh endpoint
    expect(useCourierSession.getState()).toMatchObject({ accessToken: null, status: null });
  });

  it.each([
    [403, 'e403'],
    [404, 'e404'],
    [500, 'e500'],
    [503, 'e503'],
    [504, 'e504'],
  ])('%i → %s', async (status, kind) => {
    server.use(http.get(url('/c/me'), () => HttpResponse.json({ code: 'X', message: 'x' }, { status })));
    const e = await api(0)
      .GET('/c/me')
      .catch((x: unknown) => x);
    expect((e as ApiError).kind).toBe(kind);
  });

  it('503 on a read is retried before the page; a recovery in between succeeds', async () => {
    let n = 0;
    server.use(
      http.get(url('/c/offers'), () =>
        ++n < 2 ? HttpResponse.json({ code: 'X', message: 'x' }, { status: 503 }) : HttpResponse.json([]),
      ),
    );
    const { data } = await createCourierApi(BASE, { retries: 2 }).GET('/c/offers');
    expect(data).toEqual([]);
    expect(n).toBe(2);
  });

  it('offline → the offline page, without sending anything', async () => {
    let sent = false;
    server.use(
      http.get(url('/c/offers'), () => {
        sent = true;
        return HttpResponse.json([]);
      }),
    );
    const e = await createCourierApi(BASE, { isOnline: () => false })
      .GET('/c/offers')
      .catch((x: unknown) => x);
    expect((e as ApiError).kind).toBe('offline');
    expect(sent).toBe(false);
  });

  it('a network failure → offline', async () => {
    server.use(http.get(url('/c/me'), () => HttpResponse.error()));
    const e = await api(0)
      .GET('/c/me')
      .catch((x: unknown) => x);
    expect((e as ApiError).kind).toBe('offline');
  });
});

describe('inline 409s the app reacts to', () => {
  beforeEach(() => {
    asApp(true);
    useCourierSession.getState().setSession({ accessToken: 'c-1-09131234567', status: 'approved' });
  });

  it('accept after another courier won → isOfferGone (close the alert, toast), no error page', async () => {
    const client = api();
    await client.PUT('/c/status', { body: { online: true } });
    server.use(
      http.post(url('/c/offers/of1/accept'), () =>
        HttpResponse.json({ code: 'OFFER_TAKEN', message: 'پیک دیگری این سفارش را برداشت' }, { status: 409 }),
      ),
    );
    const { data, error, response } = await offerAction(client, 'of1', 'accept');
    expect(data).toBeUndefined();
    expect(response.status).toBe(409);
    expect(isOfferGone(error)).toBe(true);
    expect(businessError(error)?.message).toBe('پیک دیگری این سفارش را برداشت');
  });

  it('accept succeeds against the mock and returns the full order', async () => {
    const client = api();
    await client.PUT('/c/status', { body: { online: true } });
    const { data } = await offerAction(client, 'of2', 'accept');
    expect(data).toMatchObject({ id: 'ord-of2', stage: 'toRest', custAddress: expect.any(String) });
  });

  it('going offline with an active order → hasActiveOrder', async () => {
    const client = api();
    await client.PUT('/c/status', { body: { online: true } });
    await offerAction(client, 'of1', 'accept');
    const { error, response } = await client.PUT('/c/status', { body: { online: false } });
    expect(response.status).toBe(409);
    expect(hasActiveOrder(error)).toBe(true);
    expect(isOfferGone(error)).toBe(false);
  });
});

describe('Idempotency-Key on offer and order actions', () => {
  const keys: (string | null)[] = [];
  beforeEach(() => {
    keys.length = 0;
  });
  const capture = (p: string, respond: () => Response) =>
    http.post(url(p), ({ request }) => {
      keys.push(request.headers.get('Idempotency-Key'));
      return respond();
    });
  const ok = () => new HttpResponse(null, { status: 204 });
  const params = { path: { id: 'o1' } };

  it.each([
    ['/c/offers/o1/accept', (c: ReturnType<typeof api>) => offerAction(c, 'o1', 'accept')],
    ['/c/offers/o1/reject', (c: ReturnType<typeof api>) => offerAction(c, 'o1', 'reject')],
    ['/c/orders/o1/stage', (c: ReturnType<typeof api>) => c.POST('/c/orders/{id}/stage', { params, body: { stage: 'pickup' } })],
    ['/c/orders/o1/withdraw', (c: ReturnType<typeof api>) => c.POST('/c/orders/{id}/withdraw', { params, body: { reason: 'x' } })],
    ['/c/orders/o1/issue', (c: ReturnType<typeof api>) => c.POST('/c/orders/{id}/issue', { params, body: { reason: 'x' } })],
    ['/c/orders/o1/unreachable', (c: ReturnType<typeof api>) => c.POST('/c/orders/{id}/unreachable', { params })],
    ['/c/orders/o1/deliver', (c: ReturnType<typeof api>) => c.POST('/c/orders/{id}/deliver', { params, body: { cashCollected: 1000 } })],
  ])('%s sends a key', async (p, run) => {
    server.use(capture(p, ok));
    await run(api());
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('a deliver retried after a network failure reuses its key (cash is never booked twice)', async () => {
    let fail = true;
    server.use(capture('/c/orders/o1/deliver', () => (fail ? HttpResponse.error() : HttpResponse.json({ earn: 1 }))));
    const client = api();
    const deliver = () => client.POST('/c/orders/{id}/deliver', { params, body: { cashCollected: 412000 } });
    await expect(deliver()).rejects.toMatchObject({ kind: 'offline' });
    fail = false;
    await deliver();
    await deliver();
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it('status, location, OTP and reads never send a key', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.all(url('/c/*'), ({ request }) => {
        seen.push(request.headers.get('Idempotency-Key'));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = api();
    await client.PUT('/c/status', { body: { online: true } });
    await client.POST('/c/location', { body: { lat: 32, lng: 51.8 } });
    await client.POST('/c/auth/otp', { body: { phone: '09131234567' } });
    await client.GET('/c/orders/active');
    expect(seen).toEqual([null, null, null, null]);
  });
});
