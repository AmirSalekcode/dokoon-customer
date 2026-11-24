import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { server } from '@/mocks/node';
import { validate } from '@/test/jsonSchema';
import { courierHandlers, resetCourierMockDb, SESSION_COOKIE } from './handlers';
import * as S from './db';

// KAN-86: the courier MSW handlers answer every operation of the courier contract with bodies that match
// its schemas, and behave like the server for the flows the courier app depends on.
type Schema = Record<string, unknown>;
const contract = parse(
  readFileSync(path.resolve(__dirname, '../../../courier/dokoon-courier-openapi.yaml'), 'utf8'),
) as { paths: Record<string, Record<string, { responses: Record<string, Schema> }>> } & Schema;

const BASE = 'http://courier.test/v1';
/** An approved demo courier signed in through the app (bearer). */
const TOKEN = 'c-1-09131234567';
const call = (method: string, p: string, body?: unknown, headers: Record<string, string> = {}) =>
  fetch(`${BASE}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const json = async (res: Response) => (await res.json()) as Record<string, unknown>;
/** A multipart body built by hand (jsdom's FormData does not serialize under Node's fetch). */
const BOUNDARY = 'dkc-test-boundary';
const multipart = (): RequestInit => ({
  body: `--${BOUNDARY}
Content-Disposition: form-data; name="file"; filename="ins.jpg"
Content-Type: image/jpeg

x
--${BOUNDARY}--
`,
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': `multipart/form-data; boundary=${BOUNDARY}` },
});

beforeEach(() => {
  server.use(...courierHandlers);
  resetCourierMockDb();
  localStorage.clear();
});

const online = () => S.setOnline(true);
const withOrder = (stage?: 'pickup' | 'toCust' | 'handover') => () => {
  online();
  const r = S.acceptOffer('of2'); // online payment: no cash amount needed
  if (!r.ok) throw new Error('accept failed');
  const order = r.value;
  const steps = ['pickup', 'toCust', 'handover'] as const;
  for (const s of steps.slice(0, stage ? steps.indexOf(stage) + 1 : 0))
    S.advanceStage(order.id!, s, order.items!.map((i) => i.id!));
};

interface Op {
  method: string;
  path: string;
  url: string;
  body?: unknown;
  status: number;
  setup?: () => void;
  raw?: () => RequestInit;
}
const OPS: Op[] = [
  { method: 'post', path: '/c/auth/otp', url: '/c/auth/otp', body: { phone: '09131234567' }, status: 204 },
  {
    method: 'post',
    path: '/c/auth/verify',
    url: '/c/auth/verify',
    body: { phone: '09131234567', code: '1234' },
    status: 200,
  },
  { method: 'get', path: '/c/me', url: '/c/me', status: 200 },
  { method: 'get', path: '/c/doc-types', url: '/c/doc-types', status: 200 },
  {
    method: 'post',
    path: '/c/registration',
    url: '/c/registration',
    body: { name: 'مهدی کریمی', nationalId: '1234567890', plate: '۱۲۳ ط ۴۵', sheba: `IR${'1'.repeat(24)}` },
    status: 201,
  },
  {
    method: 'post',
    path: '/c/documents/{type}',
    url: '/c/documents/ins',
    status: 202,
    raw: multipart,
  },
  { method: 'put', path: '/c/status', url: '/c/status', body: { online: true }, status: 200 },
  {
    method: 'post',
    path: '/c/location',
    url: '/c/location',
    body: { lat: 32.0, lng: 51.87 },
    status: 204,
    setup: online,
  },
  { method: 'get', path: '/c/offers', url: '/c/offers', status: 200, setup: online },
  { method: 'post', path: '/c/offers/{id}/accept', url: '/c/offers/of1/accept', status: 200, setup: online },
  { method: 'post', path: '/c/offers/{id}/reject', url: '/c/offers/of1/reject', status: 204, setup: online },
  { method: 'get', path: '/c/orders/active', url: '/c/orders/active', status: 200, setup: withOrder() },
  {
    method: 'post',
    path: '/c/orders/{id}/stage',
    url: '/c/orders/ord-of2/stage',
    body: { stage: 'pickup' },
    status: 200,
    setup: withOrder(),
  },
  {
    method: 'post',
    path: '/c/orders/{id}/withdraw',
    url: '/c/orders/ord-of2/withdraw',
    body: { reason: 'موتورم خراب شد' },
    status: 204,
    setup: withOrder(),
  },
  {
    method: 'post',
    path: '/c/orders/{id}/issue',
    url: '/c/orders/ord-of2/issue',
    body: { reason: 'غذا کم است' },
    status: 204,
    setup: withOrder('pickup'),
  },
  {
    method: 'post',
    path: '/c/orders/{id}/unreachable',
    url: '/c/orders/ord-of2/unreachable',
    status: 204,
    setup: withOrder('toCust'),
  },
  {
    method: 'post',
    path: '/c/orders/{id}/deliver',
    url: '/c/orders/ord-of2/deliver',
    body: {},
    status: 200,
    setup: withOrder('handover'),
  },
  { method: 'get', path: '/c/orders/history', url: '/c/orders/history', status: 200 },
  { method: 'get', path: '/c/earnings', url: '/c/earnings?period=week', status: 200 },
  { method: 'get', path: '/c/settlements', url: '/c/settlements', status: 200 },
  { method: 'post', path: '/c/sheba-change', url: '/c/sheba-change', status: 202 },
  {
    method: 'put',
    path: '/c/consent',
    url: '/c/consent',
    body: { performance: true, analytics: false },
    status: 204,
  },
];

/** `Me` fields proposed in contract-notes 35 (masked profile for «اطلاعات من»). */
const PROPOSED_ME = ['nationalIdMasked', 'plate', 'shebaMasked', 'shebaChangePending', 'city'];

describe('courier mock API ↔ contract', () => {
  it('covers every operation of the contract', () => {
    const contractOps = Object.entries(contract.paths).flatMap(([p, ops]) =>
      Object.keys(ops).map((m) => `${m} ${p}`),
    );
    expect(OPS.map((o) => `${o.method} ${o.path}`).sort()).toEqual(contractOps.sort());
  });

  it.each(OPS)('$method $url → $status with a body that matches the contract', async (op) => {
    op.setup?.();
    const res = op.raw
      ? await fetch(`${BASE}${op.url}`, { method: op.method.toUpperCase(), ...op.raw() })
      : await call(op.method.toUpperCase(), op.url, op.body);
    expect(res.status).toBe(op.status);
    const declared = contract.paths[op.path][op.method].responses[String(op.status)] as {
      content?: Record<string, { schema: Schema }>;
    };
    expect(declared, `status ${op.status} declared in the contract`).toBeDefined();
    const media = declared.content && Object.keys(declared.content)[0];
    if (!media) {
      // Undeclared bodies (history, earnings, settlements) have proposed shapes: contract-notes 34.
      if (res.status === 204 || res.status === 201 || res.status === 202) expect(await res.text()).toBe('');
      return;
    }
    expect(res.headers.get('content-type')).toContain(media);
    const data = (await res.json()) as Record<string, unknown>;
    // Proposed profile fields (contract-notes 35) are checked apart from the contract.
    if (data && typeof data === 'object') for (const k of PROPOSED_ME) delete data[k];
    expect(validate(data, declared.content![media].schema, contract)).toEqual([]);
  });
});

describe('courier mock API — session', () => {
  const verify = (headers: Record<string, string> = {}) =>
    fetch(`${BASE}/c/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ phone: '09131234567', code: '1234' }),
    });

  it('web: the session is an HttpOnly cookie and the body carries no token', async () => {
    const res = await verify({ 'X-Dokoon-Client': 'courier-web' });
    const cookie = res.headers.get('Set-Cookie') ?? '';
    expect(cookie).toMatch(new RegExp(`^${SESSION_COOKIE}=c-\\d+-09131234567;`));
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(await json(res)).not.toHaveProperty('accessToken');
  });

  it('app: the token comes in the body and no cookie is set', async () => {
    const res = await verify({ 'X-Dokoon-Client': 'courier-android' });
    expect(res.headers.get('Set-Cookie')).toBeNull();
    expect((await json(res)).accessToken).toMatch(/^c-\d+-09131234567$/);
  });

  it('the session cookie authenticates like the bearer token; neither → 401', async () => {
    const withCookie = await fetch(`${BASE}/c/me`, { headers: { Cookie: `${SESSION_COOKIE}=${TOKEN}` } });
    expect(withCookie.status).toBe(200);
    expect((await json(withCookie)).phone).toBe('09131234567');
    const none = await fetch(`${BASE}/c/me`);
    expect(none.status).toBe(401);
    expect(await json(none)).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('OTP: bad phone 400, a second request inside the resend window 429, wrong code 401', async () => {
    expect((await call('POST', '/c/auth/otp', { phone: '0913' })).status).toBe(400);
    expect((await call('POST', '/c/auth/otp', { phone: '09131234567' })).status).toBe(204);
    const again = await call('POST', '/c/auth/otp', { phone: '09131234567' });
    expect(again.status).toBe(429);
    expect(await json(again)).toMatchObject({ code: 'RATE_LIMITED' });
    const wrong = await call('POST', '/c/auth/verify', { phone: '09131234567', code: '0000' });
    expect(wrong.status).toBe(401);
    expect(await json(wrong)).toMatchObject({ code: 'OTP_INVALID' });
  });

  it('demo phones cover every approval state; registration moves a new courier to pending', async () => {
    const statusFor = async (phone: string) =>
      (await json(await call('GET', '/c/me', undefined, { Authorization: `Bearer c-9-${phone}` }))).status;
    expect(await statusFor('09120000001')).toBe('new');
    expect(await statusFor('09120000002')).toBe('pending');
    expect(await statusFor('09120000003')).toBe('suspended');
    expect(await statusFor('09131234567')).toBe('approved');
    const reg = await call(
      'POST',
      '/c/registration',
      { name: 'سارا', nationalId: '123', plate: '', sheba: 'IR1' },
      { Authorization: 'Bearer c-9-09120000001' },
    );
    expect(reg.status).toBe(422);
    expect((await json(reg)).fields).toEqual({
      nationalId: expect.any(String),
      plate: expect.any(String),
      sheba: expect.any(String),
    });
    await call(
      'POST',
      '/c/registration',
      { name: 'سارا کاظمی', nationalId: '1234567890', plate: '۱۲۳ ط ۴۵', sheba: `IR${'2'.repeat(24)}` },
      { Authorization: 'Bearer c-9-09120000001' },
    );
    expect(await statusFor('09120000001')).toBe('pending');
  });

  it('a courier who is not approved cannot go online or see offers (403)', async () => {
    const pending = { Authorization: 'Bearer c-9-09120000002' };
    expect((await call('PUT', '/c/status', { online: true }, pending)).status).toBe(403);
    expect((await call('GET', '/c/offers', undefined, pending)).status).toBe(403);
  });
});

describe('courier mock API — offers and the order flow', () => {
  it('offline: no offers and no location; online: the seed offers show neighbourhoods only', async () => {
    expect(await json(await call('GET', '/c/offers'))).toEqual([]);
    const loc = await call('POST', '/c/location', { lat: 32, lng: 51.8 });
    expect(loc.status).toBe(409);
    expect(await json(loc)).toMatchObject({ code: 'NOT_TRACKING' });
    await call('PUT', '/c/status', { online: true });
    const offers = (await (await call('GET', '/c/offers')).json()) as Record<string, unknown>[];
    expect(offers.map((o) => o.id)).toEqual(['of1', 'of2', 'of3']);
    // Courier rule 2: no address or phone before accepting.
    for (const o of offers) {
      expect(o).not.toHaveProperty('custAddress');
      expect(o).not.toHaveProperty('custPhone');
      expect(Date.parse(String(o.expiresAt))).toBeGreaterThan(Date.now());
    }
  });

  it('accept is atomic: taken by another courier → 409 OFFER_TAKEN, expired → 409 OFFER_EXPIRED', async () => {
    online();
    S.takeByOther('of1');
    const taken = await call('POST', '/c/offers/of1/accept');
    expect(taken.status).toBe(409);
    expect(await json(taken)).toMatchObject({ code: 'OFFER_TAKEN' });
    S.expireDue(Date.now() + 10 * 60_000);
    const expired = await call('POST', '/c/offers/of2/accept');
    expect(expired.status).toBe(409);
    expect(await json(expired)).toMatchObject({ code: 'OFFER_EXPIRED' });
    expect((await call('POST', '/c/offers/nope/accept')).status).toBe(404);
  });

  it('accept reveals address and phone; one order at a time; cannot go offline meanwhile', async () => {
    online();
    const res = await call('POST', '/c/offers/of1/accept');
    expect(await json(res)).toMatchObject({ id: 'ord-of1', stage: 'toRest', custPhone: '09131112233' });
    const second = await call('POST', '/c/offers/of2/accept');
    expect(second.status).toBe(409);
    expect(await json(second)).toMatchObject({ code: 'ACTIVE_ORDER' });
    const off = await call('PUT', '/c/status', { online: false });
    expect(off.status).toBe(409);
    expect(await json(off)).toMatchObject({ code: 'ACTIVE_ORDER' });
    expect(await json(await call('GET', '/c/orders/active'))).toMatchObject({ id: 'ord-of1' });
  });

  it('stages go one step at a time; leaving pickup needs every item ticked', async () => {
    online();
    await call('POST', '/c/offers/of1/accept');
    const skip = await call('POST', '/c/orders/ord-of1/stage', { stage: 'toCust' });
    expect(skip.status).toBe(409);
    expect(await json(skip)).toMatchObject({ code: 'INVALID_STAGE' });
    expect((await call('POST', '/c/orders/ord-of1/stage', { stage: 'pickup' })).status).toBe(200);
    const partial = await call('POST', '/c/orders/ord-of1/stage', { stage: 'toCust', checkedItems: ['i1'] });
    expect(partial.status).toBe(400);
    expect(await json(partial)).toMatchObject({ code: 'ITEMS_UNCHECKED' });
    const ok = await call('POST', '/c/orders/ord-of1/stage', {
      stage: 'toCust',
      checkedItems: ['i1', 'i2', 'i3'],
    });
    expect(await json(ok)).toMatchObject({ stage: 'toCust' });
    // After pickup, withdrawing is closed; «customer unreachable» keeps the order open.
    const late = await call('POST', '/c/orders/ord-of1/withdraw', { reason: 'مسیر بسته است' });
    expect(late.status).toBe(409);
    expect(await json(late)).toMatchObject({ code: 'WITHDRAW_CLOSED' });
    expect((await call('POST', '/c/orders/ord-of1/unreachable')).status).toBe(204);
    expect(await json(await call('GET', '/c/orders/active'))).toMatchObject({ stage: 'toCust' });
  });

  it('cash delivery needs the amount; a mismatch is allowed but reported; the trip joins history', async () => {
    online();
    const order = (await json(await call('POST', '/c/offers/of1/accept'))) as { id: string; due: number };
    await call('POST', `/c/orders/${order.id}/stage`, { stage: 'pickup' });
    await call('POST', `/c/orders/${order.id}/stage`, { stage: 'toCust', checkedItems: ['i1', 'i2', 'i3'] });
    expect((await call('POST', `/c/orders/${order.id}/deliver`, {})).status).toBe(409); // not at handover
    await call('POST', `/c/orders/${order.id}/stage`, { stage: 'handover' });
    const missing = await call('POST', `/c/orders/${order.id}/deliver`, {});
    expect(missing.status).toBe(400);
    expect(await json(missing)).toMatchObject({ code: 'CASH_REQUIRED' });
    const done = await call('POST', `/c/orders/${order.id}/deliver`, { cashCollected: order.due - 2000 });
    expect(await json(done)).toEqual({ earn: 68000, cashMismatch: true });
    expect((await call('GET', '/c/orders/active')).status).toBe(204);
    const page = await json(await call('GET', '/c/orders/history'));
    expect((page.items as Record<string, unknown>[])[0]).toMatchObject({
      no: 4821,
      cash: true,
      cashCollected: order.due - 2000,
    });
    // Free again → can go offline.
    expect((await call('PUT', '/c/status', { online: false })).status).toBe(200);
  });

  it('withdraw before pickup frees the courier; reasons are required', async () => {
    online();
    await call('POST', '/c/offers/of3/accept');
    expect((await call('POST', '/c/orders/ord-of3/withdraw', {})).status).toBe(400);
    expect((await call('POST', '/c/orders/ord-of3/withdraw', { reason: 'موتورم خراب شد' })).status).toBe(204);
    expect((await call('GET', '/c/orders/active')).status).toBe(204);
    expect((await call('POST', '/c/orders/ord-of3/issue', { reason: 'x' })).status).toBe(404);
  });
});

describe('courier mock API — history, money, documents', () => {
  it('history pages by cursor', async () => {
    const first = await json(await call('GET', '/c/orders/history'));
    expect((first.items as unknown[]).length).toBe(20);
    expect(first.nextCursor).toBe('20');
    const last = await json(await call('GET', '/c/orders/history?cursor=40'));
    expect((last.items as unknown[]).length).toBe(5);
    expect(last).not.toHaveProperty('nextCursor');
    expect((await call('GET', '/c/orders/history?cursor=x')).status).toBe(400);
  });

  it('earnings per period (integer toman); unknown period 400', async () => {
    for (const period of ['today', 'week', 'month']) {
      const e = await json(await call('GET', `/c/earnings?period=${period}`));
      expect(e.period).toBe(period);
      for (const k of ['total', 'avg', 'balance', 'cashHeld']) expect(Number.isInteger(e[k])).toBe(true);
    }
    expect((await call('GET', '/c/earnings?period=year')).status).toBe(400);
  });

  it('settlements show the Sheba masked only', async () => {
    const list = (await (await call('GET', '/c/settlements')).json()) as { shebaMasked: string }[];
    expect(list.length).toBeGreaterThan(0);
    for (const s of list) expect(s.shebaMasked).toMatch(/^•+\d{4}$/);
    expect(JSON.stringify(list)).not.toMatch(/IR\d{24}/);
  });

  it('a renewed document goes to review (wait); unknown type 404; no file 400', async () => {
    expect((await fetch(`${BASE}/c/documents/ins`, { method: 'POST', ...multipart() })).status).toBe(202);
    const me = await json(await call('GET', '/c/me'));
    expect(me.docs).toContainEqual({ type: 'ins', status: 'wait' });
    expect((await fetch(`${BASE}/c/documents/zzz`, { method: 'POST', ...multipart() })).status).toBe(404);
    expect((await call('POST', '/c/documents/ins', {})).status).toBe(400);
  });
});

describe('dev-only failure injection', () => {
  it('dkc-mock-status forces every GET to that status', async () => {
    localStorage.setItem('dkc-mock-status', '503');
    const res = await call('GET', '/c/me');
    expect(res.status).toBe(503);
    expect((await call('PUT', '/c/consent', {})).status).toBe(204);
  });
});
