import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { server } from '@/mocks/node';
import { validate } from '@/test/jsonSchema';
import { db } from './db';
import { panelHandlers, resetPanelMockDb } from './handlers';

// KAN-56: the panel's MSW handlers answer every operation of the restaurant contract with bodies that
// match its schemas, and behave like the server for the flows the panel depends on.
type Schema = Record<string, unknown>;
const contract = parse(
  readFileSync(path.resolve(__dirname, '../../../restaurant/dokoon-restaurant-openapi.yaml'), 'utf8'),
) as { paths: Record<string, Record<string, { responses: Record<string, Schema> }>> } & Schema;

const BASE = 'http://panel.test/v1';
const call = (method: string, p: string, body?: unknown, headers: Record<string, string> = {}) =>
  fetch(`${BASE}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  localStorage.clear();
});

interface Op {
  method: string;
  path: string;
  url: string;
  body?: unknown;
  status: number;
}
const food = { name: 'کباب ترش', price: 310000, categoryId: 'kebab', available: true };
const OPS: Op[] = [
  {
    method: 'post',
    path: '/r/auth/otp/request',
    url: '/r/auth/otp/request',
    body: { phone: '09131234567' },
    status: 200,
  },
  {
    method: 'post',
    path: '/r/auth/otp/verify',
    url: '/r/auth/otp/verify',
    body: { phone: '09131234567', code: '1234' },
    status: 200,
  },
  {
    method: 'post',
    path: '/r/auth/refresh',
    url: '/r/auth/refresh',
    body: { refreshToken: 'r-mock' },
    status: 200,
  },
  { method: 'post', path: '/r/auth/logout', url: '/r/auth/logout', status: 204 },
  { method: 'post', path: '/r/stream/ticket', url: '/r/stream/ticket', status: 200 },
  {
    method: 'post',
    path: '/r/registration',
    url: '/r/registration',
    body: {
      name: 'کبابی تازه',
      address: 'شهرضا، خیابان امام',
      lat: 32.0,
      lng: 51.86,
      sheba: 'IR062960000000100324200001',
    },
    status: 201,
  },
  { method: 'get', path: '/r/registration/status', url: '/r/registration/status', status: 200 },
  { method: 'get', path: '/r/doc-types', url: '/r/doc-types', status: 200 },
  {
    method: 'post',
    path: '/r/docs',
    url: '/r/docs',
    body: { docTypeId: 'lic', uploadId: 'up1' },
    status: 201,
  },
  { method: 'get', path: '/r/me', url: '/r/me', status: 200 },
  { method: 'patch', path: '/r/me', url: '/r/me', body: { name: 'کبابی زاگرس' }, status: 200 },
  {
    method: 'post',
    path: '/r/me/sheba-change',
    url: '/r/me/sheba-change',
    body: { sheba: 'IR062960000000100324200001', otpCode: '1234' },
    status: 202,
  },
  { method: 'put', path: '/r/open', url: '/r/open', body: { open: false }, status: 200 },
  { method: 'get', path: '/r/hours', url: '/r/hours', status: 200 },
  {
    method: 'put',
    path: '/r/hours',
    url: '/r/hours',
    body: Array.from({ length: 7 }, (_, day) => ({ day, on: true, from: '11:00', to: '23:00' })),
    status: 200,
  },
  { method: 'get', path: '/r/settings', url: '/r/settings', status: 200 },
  {
    method: 'put',
    path: '/r/settings',
    url: '/r/settings',
    body: { allowCash: true, allowExtras: true, etaMin: 30, etaMax: 45 },
    status: 200,
  },
  { method: 'get', path: '/r/orders', url: '/r/orders?tab=new', status: 200 },
  { method: 'get', path: '/r/orders/{id}', url: '/r/orders/o1', status: 200 },
  {
    method: 'post',
    path: '/r/orders/{id}/accept',
    url: '/r/orders/o1/accept',
    body: { prepMinutes: 20 },
    status: 200,
  },
  {
    method: 'post',
    path: '/r/orders/{id}/extend',
    url: '/r/orders/o3/extend',
    body: { addMinutes: 5 },
    status: 200,
  },
  {
    method: 'post',
    path: '/r/orders/{id}/reject',
    url: '/r/orders/o2/reject',
    body: { reasonId: 'r1' },
    status: 200,
  },
  { method: 'post', path: '/r/orders/{id}/ready', url: '/r/orders/o3/ready', status: 200 },
  { method: 'post', path: '/r/orders/{id}/handover', url: '/r/orders/o4/handover', status: 200 },
  { method: 'get', path: '/r/reject-reasons', url: '/r/reject-reasons', status: 200 },
  { method: 'get', path: '/r/menu', url: '/r/menu', status: 200 },
  { method: 'post', path: '/r/categories', url: '/r/categories', body: { label: 'دسر' }, status: 201 },
  {
    method: 'patch',
    path: '/r/categories/{id}',
    url: '/r/categories/side',
    body: { label: 'نوشیدنی' },
    status: 200,
  },
  { method: 'delete', path: '/r/categories/{id}', url: '/r/categories/kebab', status: 409 },
  { method: 'post', path: '/r/foods', url: '/r/foods', body: food, status: 201 },
  {
    method: 'put',
    path: '/r/foods/{id}',
    url: '/r/foods/m2',
    body: { ...food, discount: { price: 279000, label: 'festival', endsAt: '2099-01-01T00:00:00Z' } },
    status: 200,
  },
  { method: 'patch', path: '/r/foods/{id}', url: '/r/foods/m2', body: { available: false }, status: 200 },
  { method: 'delete', path: '/r/foods/{id}', url: '/r/foods/m7', status: 204 },
  {
    method: 'put',
    path: '/r/foods/{id}/photo',
    url: '/r/foods/m2/photo',
    body: { uploadId: 'up2' },
    status: 202,
  },
  { method: 'get', path: '/r/reports', url: '/r/reports?period=week', status: 200 },
  { method: 'get', path: '/r/settlements', url: '/r/settlements', status: 200 },
  { method: 'get', path: '/r/settlements/{id}', url: '/r/settlements/s2', status: 200 },
  { method: 'get', path: '/r/settlements/{id}/invoice', url: '/r/settlements/s2/invoice', status: 200 },
  { method: 'get', path: '/r/notifications', url: '/r/notifications', status: 200 },
  { method: 'post', path: '/r/notifications/read', url: '/r/notifications/read', body: {}, status: 204 },
  {
    method: 'post',
    path: '/r/support/messages',
    url: '/r/support/messages',
    body: { category: 'tech', text: 'کلید باز و بسته کار نمی‌کند.' },
    status: 201,
  },
  {
    method: 'post',
    path: '/r/push/subscribe',
    url: '/r/push/subscribe',
    body: { provider: 'webpush', token: 't' },
    status: 204,
  },
];

describe('restaurant mock API ↔ contract', () => {
  it('covers every operation of the contract', () => {
    const contractOps = Object.entries(contract.paths).flatMap(([p, ops]) =>
      Object.keys(ops).map((m) => `${m} ${p}`),
    );
    expect(OPS.map((o) => `${o.method} ${o.path}`).sort()).toEqual(contractOps.sort());
  });

  it.each(OPS)('$method $url → $status with a body that matches the contract', async (op) => {
    const res = await call(op.method.toUpperCase(), op.url, op.body);
    expect(res.status).toBe(op.status);
    const declared = contract.paths[op.path][op.method].responses[String(op.status)];
    expect(declared, `status ${op.status} declared in the contract`).toBeDefined();
    const resolved = (typeof declared.$ref === 'string' ? validateRef(declared.$ref) : declared) as {
      content?: Record<string, { schema: Schema }>;
    };
    const media = resolved.content && Object.keys(resolved.content)[0];
    if (!media) {
      expect(await res.text()).toBe('');
      return;
    }
    expect(res.headers.get('content-type')).toContain(media);
    if (media !== 'application/json') return;
    expect(validate(await res.json(), resolved.content![media].schema, contract)).toEqual([]);
  });
});

function validateRef(ref: string): unknown {
  return ref
    .replace(/^#\//, '')
    .split('/')
    .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], contract);
}

describe('restaurant mock API — server behaviour the panel relies on', () => {
  const json = async (res: Response) => (await res.json()) as Record<string, unknown>;

  it('OTP: bad phone 400, a second request inside the resend window 429, wrong code 400', async () => {
    expect((await call('POST', '/r/auth/otp/request', { phone: '0913' })).status).toBe(400);
    expect((await call('POST', '/r/auth/otp/request', { phone: '09131234567' })).status).toBe(200);
    const again = await call('POST', '/r/auth/otp/request', { phone: '09131234567' });
    expect(again.status).toBe(429);
    expect((await json(again)).code).toBe('RATE_LIMITED');
    expect((await call('POST', '/r/auth/otp/verify', { phone: '09131234567', code: '9999' })).status).toBe(
      400,
    );
  });

  it('demo phones cover every registration status', async () => {
    const status = async (phone: string) =>
      (await json(await call('POST', '/r/auth/otp/verify', { phone, code: '1234' }))).status;
    expect(await status('09131234567')).toBe('active');
    expect(await status('09130000001')).toBe('pending');
    expect(await status('09130000002')).toBe('needs_docs');
    expect(await status('09130000003')).toBe('rejected');
  });

  it('orders by tab, with history pages (cursor) and date filter', async () => {
    const ids = async (q: string) =>
      ((await json(await call('GET', `/r/orders?${q}`))).items as { id: string }[]).map((o) => o.id);
    expect(await ids('tab=new')).toEqual(['o1', 'o2']);
    expect(await ids('tab=prep')).toEqual(['o3']);
    expect(await ids('tab=ready_or_way')).toEqual(['o4', 'o5']);

    const first = await json(await call('GET', '/r/orders?tab=history'));
    expect((first.items as unknown[]).length).toBe(10);
    expect(first.nextCursor).toBeTruthy();
    const all: string[] = [];
    let cursor: unknown = undefined;
    do {
      const page = await json(await call('GET', `/r/orders?tab=history${cursor ? `&cursor=${cursor}` : ''}`));
      all.push(...(page.items as { id: string }[]).map((o) => o.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBeGreaterThan(10);

    // Date chips send the restaurant's local dates (D-102).
    const local = (d: Date) => d.toLocaleDateString('en-CA');
    const weekAgo = local(new Date(Date.now() - 6 * 24 * 3600_000));
    const today = local(new Date());
    const lastWeek: string[] = [];
    cursor = undefined;
    do {
      const page = await json(
        await call(
          'GET',
          `/r/orders?tab=history&from=${weekAgo}&to=${today}${cursor ? `&cursor=${cursor}` : ''}`,
        ),
      );
      for (const o of page.items as { id: string; placedAt: string }[]) {
        expect(local(new Date(o.placedAt)) >= weekAgo).toBe(true);
        lastWeek.push(o.id);
      }
      cursor = page.nextCursor;
    } while (cursor);
    expect(lastWeek.length).toBeGreaterThan(0);
    expect(lastWeek.length).toBeLessThan(all.length);
  });

  it('accept moves new → prep; answering again is 409 ALREADY_ANSWERED (D-96)', async () => {
    const accepted = await json(await call('POST', '/r/orders/o1/accept', { prepMinutes: 25 }));
    expect(accepted).toMatchObject({ status: 'prep', prepMinutes: 25 });
    const second = await call('POST', '/r/orders/o1/accept', { prepMinutes: 15 });
    expect(second.status).toBe(409);
    expect((await json(second)).code).toBe('ALREADY_ANSWERED');
    await call('POST', '/r/orders/o2/reject', { reasonId: 'r1' });
    expect((await json(await call('POST', '/r/orders/o2/accept', { prepMinutes: 15 }))).code).toBe(
      'ALREADY_ANSWERED',
    );
  });

  it('invalid transitions are 409 INVALID_TRANSITION; the full cycle works', async () => {
    const bad = await call('POST', '/r/orders/o1/ready');
    expect(bad.status).toBe(409);
    expect((await json(bad)).code).toBe('INVALID_TRANSITION');
    await call('POST', '/r/orders/o1/accept', { prepMinutes: 20 });
    expect((await json(await call('POST', '/r/orders/o1/extend', { addMinutes: 5 }))).prepMinutes).toBe(25);
    expect((await json(await call('POST', '/r/orders/o1/ready'))).status).toBe('ready');
    expect((await json(await call('POST', '/r/orders/o1/handover'))).status).toBe('way');
  });

  it('reject stores the reason label; prep orders can be cancelled', async () => {
    expect(await json(await call('POST', '/r/orders/o2/reject', { reasonId: 'r1' }))).toMatchObject({
      status: 'rejected',
      rejectReason: 'مواد اولیه تمام شده',
    });
    expect((await json(await call('POST', '/r/orders/o3/reject', { reasonId: 'r2' }))).status).toBe(
      'cancelled',
    );
  });

  it('accept validates prepMinutes 5..120', async () => {
    expect((await call('POST', '/r/orders/o1/accept', { prepMinutes: 3 })).status).toBe(400);
  });

  it('a category with foods cannot be deleted (409); an empty one can', async () => {
    const res = await call('DELETE', '/r/categories/kebab');
    expect((await json(res)).code).toBe('CATEGORY_NOT_EMPTY');
    const created = await json(await call('POST', '/r/categories', { label: 'دسر' }));
    expect((await call('DELETE', `/r/categories/${created.id}`)).status).toBe(204);
  });

  // KAN-108 (D-131): per-food discount rules.
  it('the sample menu has a «تخفیف ویژه» and a 3-day «جشنواره»', async () => {
    const foods = (await json(await call('GET', '/r/menu'))).foods as {
      id: string;
      price: number;
      discount: { price: number; label: string; endsAt: string | null } | null;
    }[];
    const m1 = foods.find((f) => f.id === 'm1')!;
    expect(m1).toMatchObject({ price: 320000, discount: { price: 285000, label: 'special', endsAt: null } });
    const m3 = foods.find((f) => f.id === 'm3')!;
    expect(m3.discount).toMatchObject({ price: 355000, label: 'festival' });
    const days = (Date.parse(m3.discount!.endsAt!) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(2.9);
    expect(days).toBeLessThanOrEqual(3);
    expect(foods.filter((f) => f.discount)).toHaveLength(2);
    expect(foods.some((f) => 'oldPrice' in f)).toBe(false);
  });

  it('a discount not below the price, above 90%, below 1% or already ended is 409 DISCOUNT_INVALID', async () => {
    const put = (discount: unknown, price = 300000) =>
      call('PUT', '/r/foods/m2', { ...food, price, discount });
    const code = async (res: Response) => [res.status, (await json(res)).code];
    expect(await code(await put({ price: 300000, label: 'special', endsAt: null }))).toEqual([
      409,
      'DISCOUNT_INVALID',
    ]);
    expect(await code(await put({ price: 26000, label: 'special', endsAt: null }))).toEqual([
      409,
      'DISCOUNT_INVALID',
    ]);
    expect(await code(await put({ price: 299000, label: 'special', endsAt: null }))).toEqual([
      409,
      'DISCOUNT_INVALID',
    ]);
    expect(
      await code(await put({ price: 270000, label: 'special', endsAt: '2020-01-01T00:00:00Z' })),
    ).toEqual([409, 'DISCOUNT_INVALID']);
    // Lowering the base price below a kept discount is rejected too.
    expect((await put({ price: 270000, label: 'special', endsAt: null })).status).toBe(200);
    expect(await code(await put({ price: 270000, label: 'special', endsAt: null }, 260000))).toEqual([
      409,
      'DISCOUNT_INVALID',
    ]);
  });

  it('«پایان تخفیف» (PATCH discount null) ends it; PUT without discount clears it', async () => {
    expect((await call('PATCH', '/r/foods/m1', { discount: null })).status).toBe(200);
    const menu = async () => (await json(await call('GET', '/r/menu'))).foods as Record<string, unknown>[];
    expect((await menu()).find((f) => f.id === 'm1')).toMatchObject({ price: 320000, discount: null });
    await call('PUT', '/r/foods/m3', { name: 'برگ', price: 395000, categoryId: 'kebab' });
    expect((await menu()).find((f) => f.id === 'm3')?.discount).toBeNull();
  });

  it('an ended discount disappears from the menu by itself', async () => {
    const m3 = db.foods.find((f) => f.id === 'm3')!;
    m3.discount = { price: 355000, label: 'festival', endsAt: new Date(Date.now() - 1000).toISOString() };
    const foods = (await json(await call('GET', '/r/menu'))).foods as Record<string, unknown>[];
    expect(foods.find((f) => f.id === 'm3')?.discount).toBeNull();
  });

  it('availability toggle and open switch are kept', async () => {
    await call('PATCH', '/r/foods/m2', { available: false });
    const menu = await json(await call('GET', '/r/menu'));
    expect((menu.foods as { id: string; available: boolean }[]).find((f) => f.id === 'm2')?.available).toBe(
      false,
    );
    await call('PUT', '/r/open', { open: false });
    expect((await json(await call('GET', '/r/me'))).open).toBe(false);
  });

  it('settings: etaMax below etaMin is 400', async () => {
    const res = await call('PUT', '/r/settings', {
      allowCash: true,
      allowExtras: true,
      etaMin: 40,
      etaMax: 30,
    });
    expect(res.status).toBe(400);
  });

  it('phone and Sheba are always masked', async () => {
    const me = await json(await call('GET', '/r/me'));
    expect(me.shebaMasked).toMatch(/\*{4}/);
    expect(me.phoneMasked).toMatch(/•|\*/);
    const order = await json(await call('GET', '/r/orders/o1'));
    expect(order.customerPhoneMasked).toMatch(/•|\*/);
  });
});

describe('dev-only failure injection (used by the error-page E2E)', () => {
  it('dk-mock-status forces every GET to that status', async () => {
    localStorage.setItem('dk-mock-status', '503');
    expect((await call('GET', '/r/me')).status).toBe(503);
    expect((await call('POST', '/r/auth/logout')).status).toBe(204);
  });

  it('GET /app/config (shared endpoint, D-106) honours dk-mock-config', async () => {
    expect(await (await call('GET', '/app/config')).json()).toMatchObject({ maintenance: false });
    localStorage.setItem('dk-mock-config', JSON.stringify({ maintenance: true }));
    expect(await (await call('GET', '/app/config')).json()).toMatchObject({ maintenance: true });
  });
});
