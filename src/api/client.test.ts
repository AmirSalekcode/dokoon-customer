import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { createApi } from './client';
import { ApiError } from './errors';
import { createHttp } from './http';

const base = 'http://localhost/api/v1';

describe('generated API client against mock server', () => {
  it('fetches typed home data', async () => {
    const api = createApi(base);
    const { data, error } = await api.GET('/home');
    expect(error).toBeUndefined();
    expect(data?.sections?.[0].restaurants?.[0].name).toBe('کباب‌سرای نقش‌جهان');
  });

  it('returns business errors (400) inline with code + Persian message', async () => {
    const api = createApi(base);
    const { data, error } = await api.POST('/auth/otp/verify', {
      body: { phone: '09131234567', code: '0000' },
    });
    expect(data).toBeUndefined();
    expect(error).toMatchObject({ code: 'OTP_INVALID' });
  });

  it('computes a server-side quote including promo and min order', async () => {
    const api = createApi(base);
    const { data } = await api.POST('/checkout/quote', {
      body: {
        restaurantId: 'naghsh',
        addressId: 'a1',
        payMethod: 'cash',
        lines: [{ foodId: 'n1', qty: 1 }],
        promoCode: 'DOKOON10',
      },
    });
    expect(data?.itemsTotal).toBe(285000);
    expect(data?.discount).toBe(28500);
    expect(data?.belowMinBy).toBe(0);
    expect(data?.payMethods).toEqual(['online', 'cash']);
  });
});

describe('http layer', () => {
  it('maps 404 to ApiError kind e404', async () => {
    const api = createApi(base);
    await expect(api.GET('/restaurants/{id}', { params: { path: { id: 'nope' } } })).rejects.toMatchObject({
      kind: 'e404',
      status: 404,
    });
  });

  it('retries 503 with backoff then succeeds', async () => {
    let calls = 0;
    server.use(
      http.get('*/v1/cities', () => {
        calls++;
        return calls < 3 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json([]);
      }),
    );
    const f = createHttp({ backoffMs: 1 });
    const res = await f(`${base}/cities`);
    expect(res.status).toBe(200);
    expect(calls).toBe(3);
  });

  it('gives up after retries and throws e503', async () => {
    server.use(http.get('*/v1/cities', () => new HttpResponse(null, { status: 503 })));
    const f = createHttp({ backoffMs: 1, retries: 1 });
    await expect(f(`${base}/cities`)).rejects.toBeInstanceOf(ApiError);
    await expect(f(`${base}/cities`)).rejects.toMatchObject({ kind: 'e503' });
  });

  it('does not retry non-idempotent POST on 503', async () => {
    let calls = 0;
    server.use(
      http.post('*/v1/orders', () => {
        calls++;
        return new HttpResponse(null, { status: 503 });
      }),
    );
    const f = createHttp({ backoffMs: 1 });
    await expect(f(`${base}/orders`, { method: 'POST', body: '{}' })).rejects.toMatchObject({ kind: 'e503' });
    expect(calls).toBe(1);
  });

  it('throws offline without calling the network when navigator is offline', async () => {
    const f = createHttp({ isOnline: () => false });
    await expect(f(`${base}/cities`)).rejects.toMatchObject({ kind: 'offline' });
  });

  it('times out → e504', async () => {
    server.use(http.get('*/v1/cities', () => new Promise(() => {})));
    const f = createHttp({ timeoutMs: 20, retries: 0 });
    await expect(f(`${base}/cities`)).rejects.toMatchObject({ kind: 'e504' });
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get('*/v1/me', ({ request }) => {
        seen.push(request.headers.get('Authorization'));
        return seen.length === 1 ? new HttpResponse(null, { status: 401 }) : HttpResponse.json({ id: 'u1' });
      }),
    );
    let token = 'old';
    const f = createHttp({
      getAccessToken: () => token,
      onUnauthorized: async () => {
        token = 'new';
        return true;
      },
    });
    const res = await f(`${base}/me`);
    expect(res.status).toBe(200);
    expect(seen).toEqual(['Bearer old', 'Bearer new']);
  });

  it('401 that cannot be refreshed → e401', async () => {
    server.use(http.get('*/v1/me', () => new HttpResponse(null, { status: 401 })));
    const f = createHttp({ onUnauthorized: async () => false });
    await expect(f(`${base}/me`)).rejects.toMatchObject({ kind: 'e401' });
  });
});
