import { delay, http, HttpResponse, type HttpResponseResolver } from 'msw';
import type { ApiErrorBody, CourierStatus, EarningsPeriod, HistoryPage, VerifyResult } from '../api/types';
import * as D from './data';
import * as S from './db';

export { resetCourierMockDb } from './db';

/**
 * MSW handlers for the courier contract (courier/dokoon-courier-openapi.yaml). Mock/demo builds and tests
 * only. Every operation is covered and checked against the contract in handlers.test.ts. Behaves like the
 * proposed server (contract-notes 30–37): HttpOnly cookie session for the web, bearer token for the app.
 */
const p = (path: string) => `*/v1${path}`;
const err = (status: number, code: string, message: string) =>
  HttpResponse.json<ApiErrorBody>({ code, message }, { status });
const noContent = () => new HttpResponse(null, { status: 204 });
const latency = () => delay(import.meta.env.MODE === 'test' ? 0 : 250);

/** Persian messages of the business codes (what the real server would send). */
const MESSAGES: Record<string, string> = {
  ACTIVE_ORDER: 'یک سفارش در جریان دارید؛ اول آن را تحویل دهید',
  OFFER_TAKEN: 'پیک دیگری این سفارش را برداشت',
  OFFER_EXPIRED: 'زمان پذیرش این سفارش تمام شد',
  NOT_FOUND: 'سفارش پیدا نشد',
  INVALID_STAGE: 'وضعیت سفارش تغییر کرده است؛ صفحه را تازه کنید',
  ITEMS_UNCHECKED: 'همه‌ی غذاها را تیک بزنید',
  WITHDRAW_CLOSED: 'بعد از تحویل‌گرفتن غذا امکان انصراف نیست',
  CASH_REQUIRED: 'مبلغ نقدی دریافت‌شده را وارد کنید',
  NOT_TRACKING: 'وقتی آفلاین هستید موقعیت ارسال نمی‌شود',
};
const failed = (r: { status: number; code: string }) => err(r.status, r.code, MESSAGES[r.code] ?? 'خطا');

function readLocal(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
/** Dev-only: localStorage `dkc-mock-status` (e.g. "503") makes every GET fail with that status. */
const forcedStatus = () => Number(readLocal('dkc-mock-status')) || null;

// ---- session: cookie (web) or bearer (app) ----
export const SESSION_COOKIE = 'dkc_session';
let tokenSeq = 0;
/** Mock tokens carry the phone (`c-<seq>-<phone>`) so a reload still knows the demo status. */
const phoneOf = (token: string | null | undefined) => /-(09\d{9})$/.exec(token ?? '')?.[1] ?? null;
function sessionPhone(request: Request, cookies: Record<string, string>): string | null {
  const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  return phoneOf(bearer) ?? phoneOf(cookies[SESSION_COOKIE]);
}
const statusOf = (phone: string): CourierStatus =>
  db().registrations[phone] ?? D.DEMO_STATUS_PHONES[phone] ?? 'approved';
const db = () => S.db;

type Ctx = Parameters<HttpResponseResolver>[0];
/** Signed-in only: no cookie and no bearer → 401 (the app's e401 page → login). */
const authed =
  (resolver: (ctx: Ctx, phone: string) => Response | Promise<Response>) =>
  async (ctx: Ctx): Promise<Response> => {
    await latency();
    const phone = sessionPhone(ctx.request, ctx.cookies);
    if (!phone) return err(401, 'UNAUTHORIZED', 'دوباره وارد شوید');
    return resolver(ctx, phone);
  };
/** Order and offer flows: approved couriers only (403 otherwise). */
const approved =
  (resolver: (ctx: Ctx, phone: string) => Response | Promise<Response>) =>
  authed((ctx, phone) =>
    statusOf(phone) === 'approved' ? resolver(ctx, phone) : err(403, 'NOT_APPROVED', 'حساب شما فعال نیست'),
  );

const body = async (request: Request) =>
  (await request.json().catch(() => ({}))) as Record<string, unknown>;
const id = (ctx: Ctx) => String(ctx.params.id);

export const courierHandlers = [
  // Failure injection first, for GETs only (writes keep working so the demo can recover).
  http.get(p('/c/*'), async () => {
    const s = forcedStatus();
    if (!s) return undefined;
    await latency();
    return err(s, 'MOCK_FORCED', 'خطای ساختگی');
  }),

  // ---- auth ----
  http.post(p('/c/auth/otp'), async ({ request }) => {
    await latency();
    const { phone } = await body(request);
    if (typeof phone !== 'string' || !/^09\d{9}$/.test(phone))
      return err(400, 'PHONE_INVALID', 'شماره‌ی موبایل درست نیست');
    const last = db().otpSentAt[phone];
    if (last && Date.now() - last < D.RESEND_SEC * 1000)
      return err(429, 'RATE_LIMITED', 'کد قبلاً فرستاده شده؛ کمی بعد دوباره تلاش کنید');
    db().otpSentAt[phone] = Date.now();
    return noContent();
  }),
  http.post(p('/c/auth/verify'), async ({ request }) => {
    await latency();
    const { phone, code } = await body(request);
    if (typeof phone !== 'string' || !/^09\d{9}$/.test(phone))
      return err(400, 'PHONE_INVALID', 'شماره‌ی موبایل درست نیست');
    if (code !== D.OTP_CODE) return err(401, 'OTP_INVALID', 'کد واردشده درست نیست');
    tokenSeq += 1;
    const token = `c-${tokenSeq}-${phone}`;
    const me: VerifyResult = D.me(phone, statusOf(phone), db().docs);
    if (request.headers.get('X-Dokoon-Client') === 'courier-android')
      return HttpResponse.json({ ...me, accessToken: token });
    // Web: the session is an HttpOnly cookie; the body never carries the token. (Mock builds only: MSW
    // keeps mocked cookies in its own `__msw-cookie-store__` in localStorage; a real HttpOnly cookie is
    // unreadable to scripts and production builds contain no MSW.)
    return HttpResponse.json(me, {
      headers: { 'Set-Cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict` },
    });
  }),

  // ---- profile & registration ----
  http.get(
    p('/c/me'),
    authed((_, phone) =>
      HttpResponse.json(D.me(phone, statusOf(phone), db().docs, db().shebaChangeRequested)),
    ),
  ),
  http.get(
    p('/c/doc-types'),
    authed(() => HttpResponse.json(D.docTypes)),
  ),
  http.post(
    p('/c/registration'),
    authed(async ({ request }, phone) => {
      const b = await body(request);
      const fields: Record<string, string> = {};
      if (typeof b.name !== 'string' || b.name.trim().length < 3) fields.name = 'نام و نام خانوادگی را کامل بنویسید';
      if (typeof b.nationalId !== 'string' || !/^\d{10}$/.test(b.nationalId)) fields.nationalId = 'کد ملی ۱۰ رقم است';
      else if (b.nationalId === D.TAKEN_NATIONAL_ID) fields.nationalId = 'این کد ملی برای پیک دیگری ثبت شده است';
      if (typeof b.plate !== 'string' || b.plate.trim().length < 5) fields.plate = 'پلاک موتور را کامل بنویسید';
      if (typeof b.sheba !== 'string' || !/^IR\d{24}$/.test(b.sheba)) fields.sheba = 'شماره‌ی شبا درست نیست';
      if (Object.keys(fields).length)
        return HttpResponse.json<ApiErrorBody>(
          { code: 'VALIDATION', message: 'اطلاعات ثبت‌نام کامل نیست', fields },
          { status: 422 },
        );
      db().registrations[phone] = 'pending';
      return new HttpResponse(null, { status: 201 });
    }),
  ),
  http.post(
    p('/c/documents/:type'),
    authed(async ({ request, params }) => {
      const type = String(params.type);
      if (!D.docTypes.some((d) => d.id === type)) return err(404, 'NOT_FOUND', 'نوع مدرک پیدا نشد');
      // Raw check (multipart parsers differ between the browser, Node and jsdom): a part named file.
      const isMultipart = (request.headers.get('Content-Type') ?? '').startsWith('multipart/form-data');
      const raw = await request.arrayBuffer();
      const head = new TextDecoder().decode(raw.slice(0, 512));
      if (!isMultipart || !/name="file"/.test(head)) return err(400, 'FILE_REQUIRED', 'فایلی انتخاب نشده است');
      if (raw.byteLength > 10 * 1024 * 1024) return err(413, 'FILE_TOO_LARGE', 'حجم فایل زیاد است');
      const docs = db().docs.filter((d) => d.type !== type);
      db().docs = [...docs, { type, status: 'wait' }];
      return new HttpResponse(null, { status: 202 });
    }),
  ),
  http.post(
    p('/c/sheba-change'),
    authed(async ({ request }) => {
      // The contract has no body yet (contract-notes 35); a sent sheba must still be valid.
      const { sheba } = await body(request);
      if (sheba !== undefined && (typeof sheba !== 'string' || !/^IR\d{24}$/.test(sheba)))
        return err(400, 'SHEBA_INVALID', 'شماره‌ی شبا درست نیست');
      db().shebaChangeRequested = true;
      return new HttpResponse(null, { status: 202 });
    }),
  ),
  http.put(
    p('/c/consent'),
    authed(async ({ request }) => {
      const b = await body(request);
      db().consent = { performance: b.performance === true, analytics: b.analytics === true };
      return noContent();
    }),
  ),

  // ---- online status & location ----
  http.put(
    p('/c/status'),
    approved(async ({ request }) => {
      const { online } = await body(request);
      if (typeof online !== 'boolean') return err(400, 'VALIDATION', 'وضعیت نامعتبر است');
      const r = S.setOnline(online);
      return r.ok ? HttpResponse.json(r.value) : failed(r);
    }),
  ),
  http.post(
    p('/c/location'),
    approved(async ({ request }) => {
      const { lat, lng, at } = await body(request);
      if (typeof lat !== 'number' || typeof lng !== 'number' || Math.abs(lat) > 90 || Math.abs(lng) > 180)
        return err(400, 'VALIDATION', 'موقعیت نامعتبر است');
      const r = S.recordLocation(lat, lng, typeof at === 'string' ? at : new Date().toISOString());
      return r.ok ? noContent() : failed(r);
    }),
  ),

  // ---- offers ----
  http.get(
    p('/c/offers'),
    approved(() => {
      S.expireDue();
      return HttpResponse.json(db().online ? db().offers : []);
    }),
  ),
  http.post(
    p('/c/offers/:id/accept'),
    approved((ctx) => {
      const r = S.acceptOffer(id(ctx));
      return r.ok ? HttpResponse.json(r.value) : failed(r);
    }),
  ),
  http.post(
    p('/c/offers/:id/reject'),
    approved((ctx) => {
      S.rejectOffer(id(ctx));
      return noContent();
    }),
  ),

  // ---- active order ----
  // `history` before `:id` routes so it is never read as an order id.
  http.get(
    p('/c/orders/history'),
    authed(({ request }) => {
      const cursor = new URL(request.url).searchParams.get('cursor');
      const start = cursor === null ? 0 : Number(cursor);
      if (!Number.isInteger(start) || start < 0) return err(400, 'CURSOR_INVALID', 'صفحه نامعتبر است');
      const items = db().history.slice(start, start + D.HISTORY_PAGE);
      const next = start + D.HISTORY_PAGE;
      return HttpResponse.json<HistoryPage>({
        items,
        ...(next < db().history.length ? { nextCursor: String(next) } : {}),
      });
    }),
  ),
  http.get(
    p('/c/orders/active'),
    approved(() => (db().active ? HttpResponse.json(db().active) : noContent())),
  ),
  http.post(
    p('/c/orders/:id/stage'),
    approved(async (ctx) => {
      const b = await body(ctx.request);
      const checked = Array.isArray(b.checkedItems) ? b.checkedItems.map(String) : [];
      const r = S.advanceStage(id(ctx), String(b.stage), checked);
      return r.ok ? HttpResponse.json(r.value) : failed(r);
    }),
  ),
  http.post(
    p('/c/orders/:id/withdraw'),
    approved(async (ctx) => {
      const { reason } = await body(ctx.request);
      if (typeof reason !== 'string' || !reason.trim()) return err(400, 'REASON_REQUIRED', 'دلیل را انتخاب کنید');
      const r = S.withdraw(id(ctx));
      return r.ok ? noContent() : failed(r);
    }),
  ),
  http.post(
    p('/c/orders/:id/issue'),
    approved(async (ctx) => {
      const { reason } = await body(ctx.request);
      if (typeof reason !== 'string' || !reason.trim()) return err(400, 'REASON_REQUIRED', 'مشکل را انتخاب کنید');
      const r = S.reportIssue(id(ctx));
      return r.ok ? noContent() : failed(r);
    }),
  ),
  http.post(
    p('/c/orders/:id/unreachable'),
    approved((ctx) => {
      const r = S.reportUnreachable(id(ctx));
      return r.ok ? noContent() : failed(r);
    }),
  ),
  http.post(
    p('/c/orders/:id/deliver'),
    approved(async (ctx) => {
      const { cashCollected } = await body(ctx.request);
      const r = S.deliver(id(ctx), cashCollected);
      return r.ok ? HttpResponse.json(r.value) : failed(r);
    }),
  ),

  // ---- money (sample numbers; cash settlement rule undecided) ----
  http.get(
    p('/c/earnings'),
    authed(({ request }) => {
      const period = (new URL(request.url).searchParams.get('period') ?? 'today') as EarningsPeriod;
      const e = D.earnings[period];
      return e ? HttpResponse.json(e) : err(400, 'PERIOD_INVALID', 'بازه نامعتبر است');
    }),
  ),
  http.get(
    p('/c/settlements'),
    authed(() => HttpResponse.json(db().settlements)),
  ),
];
