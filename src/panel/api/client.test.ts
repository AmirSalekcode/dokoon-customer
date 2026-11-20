import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { ApiError } from '@/api/errors';
import { useSession } from '@/auth/session';
import { createPanelApi, orderAction } from './client';
import { businessError, isAlreadyAnswered } from './errors';
import { PANEL_SESSION_KEY, usePanelSession } from './session';

// KAN-56: restaurant API client — own session, rotating refresh, Idempotency-Key, error mapping.
const BASE = 'http://panel.test/v1';
const api = () => createPanelApi(BASE);
const url = (p: string) => `${BASE}${p}`;

beforeEach(() => {
  usePanelSession.getState().setSession({ accessToken: 'a1', refreshToken: 'r1' });
});
afterEach(() => {
  usePanelSession.getState().clear();
  useSession.getState().clear();
});

describe('session', () => {
  it('is stored apart from the customer session', () => {
    useSession.getState().setSession({ accessToken: 'customer', refreshToken: 'c' });
    usePanelSession.getState().setSession({ accessToken: 'a9', refreshToken: 'r9', status: 'active' });
    expect(JSON.parse(localStorage.getItem(PANEL_SESSION_KEY)!)).toMatchObject({
      accessToken: 'a9',
      status: 'active',
    });
    expect(useSession.getState().accessToken).toBe('customer');
  });
});

describe('401 → one refresh → retry, or → login', () => {
  it('refreshes once (rotating both tokens) and retries with the new token', async () => {
    const seen: (string | null)[] = [];
    let refreshBody: unknown = null;
    server.use(
      http.get(url('/r/me'), ({ request }) => {
        const auth = request.headers.get('Authorization');
        seen.push(auth);
        return auth === 'Bearer a2'
          ? HttpResponse.json({ id: 'r1', name: 'زاگرس' })
          : HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 });
      }),
      http.post(url('/r/auth/refresh'), async ({ request }) => {
        refreshBody = await request.json();
        return HttpResponse.json({ accessToken: 'a2', refreshToken: 'r2', status: 'active' });
      }),
    );
    const { data } = await api().GET('/r/me');
    expect(data?.name).toBe('زاگرس');
    expect(seen).toEqual(['Bearer a1', 'Bearer a2']);
    expect(refreshBody).toEqual({ refreshToken: 'r1' });
    expect(usePanelSession.getState()).toMatchObject({ accessToken: 'a2', refreshToken: 'r2' });
  });

  it('concurrent 401s share a single refresh', async () => {
    let refreshes = 0;
    server.use(
      http.get(url('/r/me'), ({ request }) =>
        request.headers.get('Authorization') === 'Bearer a2'
          ? HttpResponse.json({ id: 'r1' })
          : HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
      ),
      http.post(url('/r/auth/refresh'), () => {
        refreshes++;
        return HttpResponse.json({ accessToken: 'a2', refreshToken: 'r2' });
      }),
    );
    const client = api();
    await Promise.all([client.GET('/r/me'), client.GET('/r/me'), client.GET('/r/me')]);
    expect(refreshes).toBe(1);
  });

  it('a rejected refresh clears the session and raises the e401 page (→ login)', async () => {
    server.use(
      http.get(url('/r/me'), () =>
        HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
      ),
      http.post(url('/r/auth/refresh'), () =>
        HttpResponse.json({ code: 'REFRESH_INVALID', message: 'x' }, { status: 401 }),
      ),
    );
    const failure = await api()
      .GET('/r/me')
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).kind).toBe('e401');
    expect(usePanelSession.getState().accessToken).toBeNull();
  });
});

describe('full-page error kinds (same mapping as the customer app, D-106)', () => {
  it.each([
    [403, 'e403'],
    [404, 'e404'],
    [500, 'e500'],
    [502, 'e500'],
    [503, 'e503'],
    [504, 'e504'],
    [408, 'e504'],
  ])('%i → %s', async (status, kind) => {
    server.use(http.get(url('/r/me'), () => HttpResponse.json({ code: 'X', message: 'x' }, { status })));
    const client = createPanelApi(BASE, { retries: 0 });
    const e = await client.GET('/r/me').catch((x: unknown) => x);
    expect((e as ApiError).kind).toBe(kind);
  });
});

describe('inline business errors', () => {
  it('409 ALREADY_ANSWERED (another device answered first, D-96) stays on the screen', async () => {
    server.use(
      http.post(url('/r/orders/o1/accept'), () =>
        HttpResponse.json(
          { code: 'ALREADY_ANSWERED', message: 'این سفارش در دستگاه دیگری پاسخ داده شد' },
          { status: 409 },
        ),
      ),
    );
    const { data, error, response } = await orderAction(api(), 'o1', 'accept', { prepMinutes: 20 });
    expect(data).toBeUndefined();
    expect(response.status).toBe(409);
    expect(isAlreadyAnswered(error)).toBe(true);
    expect(businessError(error)).toEqual({
      code: 'ALREADY_ANSWERED',
      message: 'این سفارش در دستگاه دیگری پاسخ داده شد',
    });
  });

  it('429 (too many OTP requests) returns the server message to show inline', async () => {
    server.use(
      http.post(url('/r/auth/otp/request'), () =>
        HttpResponse.json(
          { code: 'RATE_LIMITED', message: 'چند دقیقه‌ی دیگر دوباره تلاش کنید' },
          { status: 429 },
        ),
      ),
    );
    const { error, response } = await api().POST('/r/auth/otp/request', { body: { phone: '09130000000' } });
    expect(response.status).toBe(429);
    expect(businessError(error)?.message).toBe('چند دقیقه‌ی دیگر دوباره تلاش کنید');
    expect(isAlreadyAnswered(error)).toBe(false);
  });

  it('an unknown error body still yields a safe Persian message', () => {
    expect(businessError(undefined)).toBeNull();
    expect(businessError({})).toEqual({ code: 'UNKNOWN', message: 'مشکلی پیش آمد؛ دوباره تلاش کنید' });
  });
});

describe('Idempotency-Key on order state changes', () => {
  const keys: (string | null)[] = [];
  beforeEach(() => {
    keys.length = 0;
  });
  const capture = (path: string, respond: () => Response) =>
    http.post(url(path), ({ request }) => {
      keys.push(request.headers.get('Idempotency-Key'));
      return respond();
    });
  const ok = () => HttpResponse.json({ id: 'o1', status: 'prep' });

  it.each([
    ['accept', { prepMinutes: 20 }],
    ['reject', { reasonId: 'r1' }],
    ['ready', undefined],
    ['handover', undefined],
    ['extend', { addMinutes: 5 }],
  ] as const)('%s sends a key', async (action, body) => {
    server.use(capture(`/r/orders/o1/${action}`, ok));
    await orderAction(api(), 'o1', action, body as never);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reuses the same key when the user retries after a network failure, and a new one after success', async () => {
    let fail = true;
    server.use(capture('/r/orders/o1/ready', () => (fail ? HttpResponse.error() : ok())));
    const client = api();
    await expect(orderAction(client, 'o1', 'ready')).rejects.toMatchObject({ kind: 'offline' });
    fail = false;
    await orderAction(client, 'o1', 'ready');
    await orderAction(client, 'o1', 'ready');
    expect(keys).toHaveLength(3);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it('keeps the key after a 5xx (the server may have applied it) and drops it after a 409', async () => {
    let status = 500;
    server.use(
      capture('/r/orders/o1/handover', () =>
        status === 200 ? ok() : HttpResponse.json({ code: 'X', message: 'x' }, { status }),
      ),
    );
    const client = api();
    await orderAction(client, 'o1', 'handover').catch(() => undefined);
    status = 409;
    await orderAction(client, 'o1', 'handover');
    status = 200;
    await orderAction(client, 'o1', 'handover');
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it('different orders or bodies never share a key; reads never send one', async () => {
    server.use(
      capture('/r/orders/o1/accept', ok),
      capture('/r/orders/o2/accept', ok),
      http.get(url('/r/orders/o1'), ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return ok();
      }),
    );
    const client = api();
    await Promise.all([
      orderAction(client, 'o1', 'accept', { prepMinutes: 20 }),
      orderAction(client, 'o2', 'accept', { prepMinutes: 20 }),
    ]);
    await client.GET('/r/orders/{id}', { params: { path: { id: 'o1' } } });
    expect(new Set(keys.slice(0, 2)).size).toBe(2);
    expect(keys[2]).toBeNull();
  });
});
