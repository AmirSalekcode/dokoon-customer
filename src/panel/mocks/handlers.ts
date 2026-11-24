import { delay, http, HttpResponse } from 'msw';
import { isActive, validateDiscount } from '@/lib/discount';
import type {
  ApiErrorBody,
  DayHours,
  FoodInput,
  MenuCategory,
  RegistrationStatus,
  RestaurantAuth,
  RestaurantSettings,
} from '../api/types';
import * as D from './data';
import { db, expireDue, listOrders, resetPanelMockDb, transition, type Transition } from './db';

export { resetPanelMockDb };

/**
 * MSW handlers for the restaurant contract (restaurant/dokoon-restaurant-openapi.yaml). Mock/demo builds
 * and tests only. Every operation is covered and checked against the contract in handlers.test.ts.
 */
const p = (path: string) => `*/v1${path}`;
const err = (status: number, code: string, message: string) =>
  HttpResponse.json<ApiErrorBody>({ code, message }, { status });
const noContent = () => new HttpResponse(null, { status: 204 });
const latency = () => delay(import.meta.env.MODE === 'test' ? 0 : 250);

/** D-131: the server ends a discount at `endsAt` by itself. */
function dropEndedDiscounts() {
  for (const f of db.foods) if (f.discount && !isActive(f.discount.endsAt)) f.discount = null;
}
/** Server rules for `discount` (409 DISCOUNT_INVALID); null when valid. */
function discountError(price: number, discount: FoodInput['discount']) {
  if (!discount) return null;
  const bad =
    validateDiscount(price, discount.price).error ?? (!isActive(discount.endsAt) && 'زمان پایان گذشته است');
  return bad ? err(409, 'DISCOUNT_INVALID', bad) : null;
}

function readLocal(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
/** Dev-only: localStorage `dk-mock-status` (e.g. "503") makes every GET fail with that status. */
const forcedStatus = () => Number(readLocal('dk-mock-status')) || null;
/** Dev-only: localStorage `dk-mock-config` (JSON) overrides GET /app/config (maintenance / update pages). */
function configOverride(): Record<string, unknown> {
  try {
    return JSON.parse(readLocal('dk-mock-config') ?? '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

const RESEND_SEC = 120;
let tokenSeq = 0;
/** Mock tokens carry the phone (`r-access-<seq>-<phone>`) so a reload still knows the demo status. */
const phoneOf = (token: string | null | undefined) => /-(09\d{9})$/.exec(token ?? '')?.[1] ?? null;
const statusOf = (phone: string | null): D.DemoStatus | 'active' =>
  (phone && (db.registrations[phone] ?? D.DEMO_STATUS_PHONES[phone])) || 'active';
function auth(phone: string | null): RestaurantAuth {
  tokenSeq += 1;
  const tail = phone ? `-${phone}` : '';
  return {
    accessToken: `r-access-${tokenSeq}${tail}`,
    refreshToken: `r-refresh-${tokenSeq}${tail}`,
    // 'new' is not in the contract enum yet (contract-notes 26).
    status: statusOf(phone) as RestaurantAuth['status'],
  };
}
const bearerPhone = (request: Request) =>
  phoneOf(request.headers.get('Authorization')?.replace(/^Bearer\s+/i, ''));

const findOrder = (id: string) => db.orders.find((o) => o.id === id);
const orderAction = (action: Transition) =>
  http.post(p(`/r/orders/:id/${action}`), async ({ params, request }) => {
    await latency();
    expireDue();
    const order = findOrder(String(params.id));
    if (!order) return err(404, 'NOT_FOUND', 'سفارش پیدا نشد');
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const arg: { prepMinutes?: number; addMinutes?: number; reason?: string } = {};
    if (action === 'accept') {
      const m = Number(body.prepMinutes);
      if (!Number.isInteger(m) || m < 5 || m > 120)
        return err(400, 'PREP_INVALID', 'زمان آماده‌سازی باید بین ۵ تا ۱۲۰ دقیقه باشد');
      arg.prepMinutes = m;
    }
    if (action === 'extend') {
      const m = Number(body.addMinutes);
      if (!Number.isInteger(m) || m < 1 || m > 30)
        return err(400, 'EXTEND_INVALID', 'زمان اضافه نامعتبر است');
      arg.addMinutes = m;
    }
    if (action === 'reject') {
      const reason = D.rejectReasons.find((r) => r.id === body.reasonId);
      if (!reason) return err(400, 'REASON_INVALID', 'دلیل را انتخاب کنید');
      arg.reason = reason.label;
    }
    const result = transition(order, action, arg);
    if (!result.ok)
      return result.code === 'ALREADY_ANSWERED'
        ? err(409, 'ALREADY_ANSWERED', 'این سفارش در دستگاه دیگری پاسخ داده شد')
        : err(409, 'INVALID_TRANSITION', 'وضعیت این سفارش تغییر کرده است؛ صفحه را تازه کنید');
    return HttpResponse.json(order);
  });

export const panelHandlers = [
  // Failure injection first, for GETs only (writes keep working so the demo can recover).
  http.get(p('/*'), async () => {
    const s = forcedStatus();
    if (!s) return undefined;
    await latency();
    return err(s, 'MOCK_FORCED', 'خطای ساختگی');
  }),

  // Shared with the customer contract (D-106); per-app config is contract-notes 22.
  http.get(p('/app/config'), () => HttpResponse.json({ ...D.appConfig, ...configOverride() })),

  // ---- auth ----
  http.post(p('/r/auth/otp/request'), async ({ request }) => {
    const { phone } = (await request.json()) as { phone?: string };
    if (!phone || !/^09\d{9}$/.test(phone)) return err(400, 'PHONE_INVALID', 'شماره‌ی موبایل درست نیست');
    const last = db.otpSentAt[phone];
    if (last && Date.now() - last < RESEND_SEC * 1000)
      return err(429, 'RATE_LIMITED', 'کد قبلاً فرستاده شده؛ کمی بعد دوباره تلاش کنید');
    db.otpSentAt[phone] = Date.now();
    return HttpResponse.json({ resendAfterSec: RESEND_SEC, codeLength: D.OTP_CODE.length });
  }),
  http.post(p('/r/auth/otp/verify'), async ({ request }) => {
    await latency();
    const { phone, code } = (await request.json()) as { phone?: string; code?: string };
    if (code !== D.OTP_CODE) return err(400, 'OTP_INVALID', 'کد واردشده درست نیست');
    return HttpResponse.json(auth(phone ?? null));
  }),
  http.post(p('/r/auth/refresh'), async ({ request }) => {
    const { refreshToken } = (await request.json().catch(() => ({}))) as { refreshToken?: string };
    return HttpResponse.json(auth(phoneOf(refreshToken)));
  }),
  http.post(p('/r/auth/logout'), () => noContent()),
  http.post(p('/r/stream/ticket'), () =>
    HttpResponse.json({ ticket: `t-${Date.now().toString(36)}`, expiresInSec: 30 }),
  ),

  // ---- uploads (customer contract POST /uploads; contract-notes 21) ----
  http.post(p('/uploads'), async ({ request }) => {
    await latency();
    // Raw check (multipart parsers differ between the browser, Node and jsdom): a part named file.
    const isMultipart = (request.headers.get('Content-Type') ?? '').startsWith('multipart/form-data');
    const raw = await request.arrayBuffer();
    const head = new TextDecoder().decode(raw.slice(0, 512));
    if (!isMultipart || !/name="file"/.test(head)) return err(400, 'FILE_REQUIRED', 'فایلی انتخاب نشده است');
    if (raw.byteLength > 10 * 1024 * 1024) return err(413, 'FILE_TOO_LARGE', 'حجم فایل زیاد است');
    db.seq += 1;
    return HttpResponse.json(
      { id: `up${db.seq}`, url: `https://cdn.example/uploads/up${db.seq}` },
      { status: 201 },
    );
  }),

  // ---- registration ----
  http.post(p('/r/registration'), async ({ request }) => {
    await latency();
    const b = (await request.json()) as { name?: string; address?: string; sheba?: string };
    if (
      !b.name ||
      b.name.length < 2 ||
      !b.address ||
      b.address.length < 8 ||
      !/^IR\d{24}$/.test(b.sheba ?? '')
    )
      return err(400, 'VALIDATION', 'اطلاعات ثبت‌نام کامل نیست');
    const phone = bearerPhone(request);
    if (phone) db.registrations[phone] = 'pending';
    return HttpResponse.json({ status: 'pending' as const }, { status: 201 });
  }),
  http.get(p('/r/registration/status'), ({ request }) => {
    const status = statusOf(bearerPhone(request));
    // 'new' (nothing submitted yet) is the proposed extra status of contract-notes 26.
    if (status === 'new') return HttpResponse.json({ status, missingDocTypeIds: [] });
    const missing =
      status === 'needs_docs' ? D.DEMO_MISSING_DOCS.filter((id) => !db.docsUploaded.includes(id)) : [];
    return HttpResponse.json<RegistrationStatus>({
      // All asked-for documents uploaded → back in review.
      status: status === 'needs_docs' && !missing.length ? 'pending' : status,
      ...(status === 'rejected' ? { reason: D.DEMO_REJECT_REASON } : {}),
      missingDocTypeIds: missing,
    });
  }),
  http.get(p('/r/doc-types'), () =>
    HttpResponse.json(D.docTypes.map((d) => ({ ...d, uploaded: db.docsUploaded.includes(d.id!) }))),
  ),
  http.post(p('/r/docs'), async ({ request }) => {
    const { docTypeId } = (await request.json()) as { docTypeId: string };
    if (!db.docsUploaded.includes(docTypeId)) db.docsUploaded.push(docTypeId);
    return new HttpResponse(null, { status: 201 });
  }),

  // ---- profile & settings ----
  http.get(p('/r/me'), () => HttpResponse.json(db.profile)),
  http.patch(p('/r/me'), async ({ request }) => {
    const b = (await request.json()) as Partial<{ name: string; address: string; lat: number; lng: number }>;
    if (b.name !== undefined && b.name.trim().length < 2) return err(400, 'VALIDATION', 'نام کوتاه است');
    if (b.address !== undefined && b.address.trim().length < 8)
      return err(400, 'VALIDATION', 'آدرس کوتاه است');
    Object.assign(db.profile, b);
    return HttpResponse.json(db.profile);
  }),
  http.post(p('/r/me/sheba-change'), async ({ request }) => {
    const { sheba, otpCode } = (await request.json()) as { sheba?: string; otpCode?: string };
    if (!/^IR\d{24}$/.test(sheba ?? '')) return err(400, 'SHEBA_INVALID', 'شماره‌ی شبا درست نیست');
    if (otpCode !== D.OTP_CODE) return err(400, 'OTP_INVALID', 'کد واردشده درست نیست');
    db.profile.pendingShebaChange = true;
    return new HttpResponse(null, { status: 202 });
  }),
  http.put(p('/r/open'), async ({ request }) => {
    const { open } = (await request.json()) as { open: boolean };
    db.profile.open = Boolean(open);
    return HttpResponse.json({ open: db.profile.open });
  }),
  http.get(p('/r/hours'), () => HttpResponse.json(db.hours)),
  http.put(p('/r/hours'), async ({ request }) => {
    const days = (await request.json()) as DayHours[];
    if (!Array.isArray(days) || days.length !== 7) return err(400, 'VALIDATION', 'ساعت هر هفت روز لازم است');
    db.hours = days;
    return new HttpResponse(null, { status: 200 });
  }),
  http.get(p('/r/settings'), () => HttpResponse.json(db.settings)),
  http.put(p('/r/settings'), async ({ request }) => {
    const s = (await request.json()) as RestaurantSettings;
    if (s.etaMin !== undefined && s.etaMax !== undefined && s.etaMax < s.etaMin)
      return err(400, 'ETA_INVALID', 'حداکثر زمان باید از حداقل بیشتر باشد');
    db.settings = { ...db.settings, ...s, acceptTimeoutSec: D.ACCEPT_TIMEOUT_SEC };
    return new HttpResponse(null, { status: 200 });
  }),

  // ---- orders ----
  http.get(p('/r/orders'), async ({ request }) => {
    await latency();
    expireDue();
    const q = new URL(request.url).searchParams;
    const page = listOrders({
      tab: q.get('tab') ?? '',
      cursor: q.get('cursor'),
      from: q.get('from'),
      to: q.get('to'),
    });
    return page ? HttpResponse.json(page) : err(400, 'TAB_INVALID', 'تب نامعتبر است');
  }),
  http.get(p('/r/orders/:id'), ({ params }) => {
    expireDue();
    const order = findOrder(String(params.id));
    return order ? HttpResponse.json(order) : err(404, 'NOT_FOUND', 'سفارش پیدا نشد');
  }),
  orderAction('accept'),
  orderAction('extend'),
  orderAction('reject'),
  orderAction('ready'),
  orderAction('handover'),
  http.get(p('/r/reject-reasons'), () => HttpResponse.json(D.rejectReasons)),

  // ---- menu ----
  http.get(p('/r/menu'), () => {
    dropEndedDiscounts();
    return HttpResponse.json({ categories: db.categories, foods: db.foods });
  }),
  http.post(p('/r/categories'), async ({ request }) => {
    const { label } = (await request.json()) as { label?: string };
    if (!label?.trim()) return err(400, 'VALIDATION', 'نام دسته را بنویسید');
    db.seq += 1;
    const cat: MenuCategory = { id: `c${db.seq}`, label: label.trim(), sort: db.categories.length + 1 };
    db.categories.push(cat);
    return HttpResponse.json(cat, { status: 201 });
  }),
  http.patch(p('/r/categories/:id'), async ({ params, request }) => {
    const cat = db.categories.find((c) => c.id === params.id);
    if (!cat) return err(404, 'NOT_FOUND', 'دسته پیدا نشد');
    const { label } = (await request.json()) as { label?: string };
    if (label?.trim()) cat.label = label.trim();
    return new HttpResponse(null, { status: 200 });
  }),
  http.delete(p('/r/categories/:id'), ({ params }) => {
    if (db.foods.some((f) => f.categoryId === params.id))
      return err(409, 'CATEGORY_NOT_EMPTY', 'فقط دسته‌ی خالی را می‌شود حذف کرد');
    db.categories = db.categories.filter((c) => c.id !== params.id);
    return noContent();
  }),
  http.post(p('/r/foods'), async ({ request }) => {
    const input = (await request.json()) as FoodInput;
    if (!input.name || input.name.length < 2 || !(input.price >= 1) || !input.categoryId)
      return err(400, 'VALIDATION', 'نام، قیمت و دسته لازم است');
    const bad = discountError(input.price, input.discount);
    if (bad) return bad;
    db.seq += 1;
    const { oldPrice: _deprecated, ...rest } = input;
    const food = {
      id: `f${db.seq}`,
      discount: null,
      description: '',
      art: 'dk-kebab',
      available: true,
      ...rest,
      groups: db.settings.allowExtras ? (input.groups ?? []) : [],
      photo: { status: 'none' as const },
    };
    db.foods.push(food);
    return HttpResponse.json(food, { status: 201 });
  }),
  http.put(p('/r/foods/:id'), async ({ params, request }) => {
    const food = db.foods.find((f) => f.id === params.id);
    if (!food) return err(404, 'NOT_FOUND', 'غذا پیدا نشد');
    const { oldPrice: _deprecated, ...input } = (await request.json()) as FoodInput;
    const bad = discountError(input.price, input.discount ?? null);
    if (bad) return bad;
    Object.assign(food, input, {
      discount: input.discount ?? null,
      groups: db.settings.allowExtras ? (input.groups ?? []) : food.groups,
    });
    return HttpResponse.json(food);
  }),
  http.patch(p('/r/foods/:id'), async ({ params, request }) => {
    const food = db.foods.find((f) => f.id === params.id);
    if (!food) return err(404, 'NOT_FOUND', 'غذا پیدا نشد');
    const body = (await request.json()) as { available?: boolean; discount?: null };
    if (typeof body.available === 'boolean') food.available = body.available;
    if ('discount' in body && body.discount === null) food.discount = null;
    return new HttpResponse(null, { status: 200 });
  }),
  http.delete(p('/r/foods/:id'), ({ params }) => {
    db.foods = db.foods.filter((f) => f.id !== params.id);
    return noContent();
  }),
  http.put(p('/r/foods/:id/photo'), ({ params }) => {
    const food = db.foods.find((f) => f.id === params.id);
    if (!food) return err(404, 'NOT_FOUND', 'غذا پیدا نشد');
    food.photo = { status: 'pending' };
    return new HttpResponse(null, { status: 202 });
  }),

  // ---- reports & settlements (server numbers only, D-94/D-95) ----
  http.get(p('/r/reports'), ({ request }) => {
    const period = new URL(request.url).searchParams.get('period') as keyof typeof D.reports;
    return D.reports[period]
      ? HttpResponse.json(D.reports[period])
      : err(400, 'PERIOD_INVALID', 'بازه نامعتبر است');
  }),
  http.get(p('/r/settlements'), () => HttpResponse.json(db.settlements)),
  http.get(p('/r/settlements/:id'), ({ params }) => {
    const s = db.settlements.find((x) => x.id === params.id);
    return s ? HttpResponse.json(s) : err(404, 'NOT_FOUND', 'تسویه پیدا نشد');
  }),
  http.get(p('/r/settlements/:id/invoice'), ({ params }) =>
    db.settlements.some((x) => x.id === params.id)
      ? new HttpResponse(D.INVOICE_PDF, { headers: { 'Content-Type': 'application/pdf' } })
      : err(404, 'NOT_FOUND', 'تسویه پیدا نشد'),
  ),

  // ---- notifications, support, push ----
  http.get(p('/r/notifications'), () => HttpResponse.json(db.notifications)),
  http.post(p('/r/notifications/read'), async ({ request }) => {
    const { ids } = (await request.json().catch(() => ({}))) as { ids?: string[] };
    for (const n of db.notifications) if (!ids || ids.includes(n.id!)) n.unread = false;
    return noContent();
  }),
  http.post(p('/r/support/messages'), async ({ request }) => {
    const { text } = (await request.json()) as { text?: string };
    if (!text || text.trim().length < 10) return err(400, 'VALIDATION', 'متن پیام حداقل ۱۰ حرف باشد');
    return new HttpResponse(null, { status: 201 });
  }),
  http.post(p('/r/push/subscribe'), () => noContent()),
];
