import { delay, http, HttpResponse } from 'msw';
import type {
  Address,
  AddressInput,
  ApiErrorBody,
  AuthResult,
  CreateOrderResult,
  Order,
  OrderDraft,
  Quote,
  User,
} from '@/api/types';
import * as D from './data';

/** Matches any origin/base, e.g. http://localhost:5173/api/v1/home or https://api.dokoon.example/v1/home */
const p = (path: string) => `*/v1${path}`;

const err = (status: number, code: string, message: string) =>
  HttpResponse.json<ApiErrorBody>({ code, message }, { status });

/**
 * Dev-only failure injection: set localStorage `dk-mock-status` to e.g. "503" and every GET
 * returns that status. Lets us exercise ErrorPage kinds without a backend.
 */
function forcedStatus(): number | null {
  try {
    const v = globalThis.localStorage?.getItem('dk-mock-status');
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

const latency = () => delay(import.meta.env.MODE === 'test' ? 0 : 250);

// ---- tiny in-memory "database" for the mock (kept in localStorage in the browser demo) ----
const DB_KEY = 'dk-mock-db';
interface MockOrder {
  order: Order;
  /** ms epoch when the order became PLACED (cash: at creation; online: after payment). */
  placedMs: number | null;
  rated: boolean;
}
interface MockDb {
  addresses: Address[];
  orders: MockOrder[];
  seq: number;
  /** Notification ids already read. */
  read: string[];
  /** Favorite restaurant ids (null = the seed data's isFavorite). */
  favs: string[] | null;
  settings: { notifyOrders: boolean; notifyPromos: boolean; notifyNews: boolean };
  /** The user who logged in last (the mock has one user at a time). null = the demo user. */
  me: User | null;
}
const freshDb = (): MockDb => ({
  addresses: [],
  orders: [],
  seq: 0,
  read: ['nt3'],
  favs: null,
  settings: { notifyOrders: true, notifyPromos: true, notifyNews: false },
  me: null,
});
function loadDb(): MockDb {
  try {
    const raw = globalThis.localStorage?.getItem(DB_KEY);
    return raw ? { ...freshDb(), ...(JSON.parse(raw) as Partial<MockDb>) } : freshDb();
  } catch {
    return freshDb();
  }
}
let db = loadDb();
function saveDb() {
  try {
    globalThis.localStorage?.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}
/** Tests: start every case from an empty mock database. */
export function resetMockDb() {
  db = freshDb();
}

const inZone = (p: { lat: number; lng: number }) => {
  const c = D.cities[0].center!;
  return Math.hypot(p.lat - c.lat, p.lng - c.lng) < 0.05;
};

/**
 * Demo progression: a placed order advances one step every 30s (mock only). Speed tests can shorten
 * it with localStorage `dk-mock-step-ms`.
 */
function stepMs(): number {
  try {
    return Number(globalThis.localStorage?.getItem('dk-mock-step-ms')) || 30_000;
  } catch {
    return 30_000;
  }
}
const STATUS_BY_STEP = ['PLACED', 'ACCEPTED', 'PREPARING', 'ON_THE_WAY', 'DELIVERED'] as const;
const COURIER = { name: 'رضا محمدی', phone: '09130000000' };

function liveOrder(m: MockOrder): Order {
  const o = m.order;
  if (o.status === 'PENDING_PAYMENT' || o.status === 'CANCELED_BY_CUSTOMER' || m.placedMs == null)
    return { ...o, canCancel: false, canRate: false };
  const step = Math.min(4, Math.floor((Date.now() - m.placedMs) / stepMs()));
  return {
    ...o,
    step,
    status: STATUS_BY_STEP[step],
    courier: step >= 3 ? COURIER : null,
    paymentStatus: o.payMethod === 'cash' ? (step === 4 ? 'cash_collected' : 'cash_due') : o.paymentStatus,
    canCancel: step === 0,
    canRate: step === 4 && !m.rated,
  };
}
const findOrder = (id: unknown) => db.orders.find((m) => m.order.id === id);
const favIds = () => db.favs ?? D.restaurantCards.filter((r) => r.isFavorite).map((r) => r.id!);
const unread = () => D.notifications.filter((n) => !db.read.includes(n.id)).length;
/** Every order the mock knows, with live status (newest first). */
const allOrders = (): Order[] => [...db.orders.map(liveOrder).reverse(), ...D.orders];
const FINAL_STATUSES = ['DELIVERED', 'CANCELED_BY_CUSTOMER', 'REJECTED', 'EXPIRED', 'PAYMENT_FAILED'];

function quote(draft: OrderDraft): Quote {
  const r = D.restaurants.find((x) => x.id === draft.restaurantId);
  const lines = draft.lines.map((l) => {
    const f = D.foods.find((x) => x.id === l.foodId);
    const opts = (f?.optionGroups ?? [])
      .flatMap((g) => g.options ?? [])
      .filter((o) => l.optionIds?.includes(o.id!));
    const unit = (f?.price ?? 0) + opts.reduce((s, o) => s + (o.priceDelta ?? 0), 0);
    return {
      foodId: l.foodId,
      title: f?.title,
      qty: l.qty,
      unitPrice: unit,
      total: unit * l.qty,
      available: f?.available ?? false,
    };
  });
  const itemsTotal = lines.reduce((s, l) => s + l.total, 0);
  const promoOk = draft.promoCode === 'DOKOON10' || draft.promoCode === 'FIRST20';
  const discount = promoOk
    ? Math.min(Math.round(itemsTotal * (draft.promoCode === 'FIRST20' ? 0.2 : 0.1)), 50000)
    : 0;
  const deliveryFee = r?.fee ?? 0;
  const minOrder = r?.minOrder ?? 0;
  return {
    lines,
    itemsTotal,
    deliveryFee,
    discount,
    total: itemsTotal + deliveryFee - discount,
    minOrder,
    belowMinBy: Math.max(0, minOrder - itemsTotal),
    promo: draft.promoCode
      ? promoOk
        ? { status: 'ok', message: 'کد تخفیف اعمال شد' }
        : { status: 'err', message: 'کد تخفیف معتبر نیست' }
      : { status: 'none', message: '' },
    etaMin: r?.etaMin,
    etaMax: r?.etaMax,
    payMethods: r?.allowCash ? ['online', 'cash'] : ['online'],
  };
}

export const handlers = [
  // Failure injection runs first for GETs.
  http.get(p('/*'), async () => {
    const s = forcedStatus();
    if (s) {
      await latency();
      return err(s, 'MOCK_FORCED', 'خطای ساختگی');
    }
    return undefined;
  }),

  http.get(p('/app/config'), () => HttpResponse.json(D.appConfig)),
  http.get(p('/cities'), () => HttpResponse.json(D.cities)),

  http.post(p('/auth/otp/request'), async ({ request }) => {
    const { phone } = (await request.json()) as { phone: string };
    if (!/^09\d{9}$/.test(phone)) return err(400, 'PHONE_INVALID', 'شماره نامعتبر است');
    return HttpResponse.json({ resendAfterSec: 120, codeLength: 4 });
  }),
  http.post(p('/auth/otp/verify'), async ({ request }) => {
    const { code, phone } = (await request.json()) as { code: string; phone: string };
    await latency();
    if (code !== '1234') return err(400, 'OTP_INVALID', 'کد واردشده درست نیست');
    const isNewUser = phone !== D.user.phone;
    db.me = isNewUser ? { id: 'u-new', phone } : { ...D.user, phone };
    saveDb();
    const body: AuthResult = {
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh',
      expiresInSec: 3600,
      isNewUser,
      // A new account has no name yet (collected on the setup screen).
      user: isNewUser ? { id: 'u-new', phone } : { ...D.user, phone },
    };
    return HttpResponse.json(body);
  }),
  http.post(p('/auth/refresh'), () =>
    HttpResponse.json<AuthResult>({
      accessToken: 'mock-access-2',
      refreshToken: 'mock-refresh-2',
      expiresInSec: 3600,
    }),
  ),
  http.post(p('/auth/logout'), () => new HttpResponse(null, { status: 204 })),

  http.get(p('/me'), () =>
    HttpResponse.json({
      ...(db.me ?? D.user),
      unreadNotifications: unread(),
      activeOrders: allOrders().filter(
        (o) => o.status !== 'PENDING_PAYMENT' && !FINAL_STATUSES.includes(o.status ?? ''),
      ).length,
    }),
  ),
  http.patch(p('/me'), async ({ request }) => {
    const patch = (await request.json()) as { name?: string; referralCode?: string; cityId?: string };
    if (patch.referralCode && !/^DOKOON-[A-Z0-9]+$/.test(patch.referralCode))
      return err(400, 'REF_INVALID', 'کد معرف معتبر نیست.');
    const me = db.me ?? { ...D.user };
    db.me = {
      ...me,
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.cityId ? { cityId: patch.cityId } : {}),
    };
    saveDb();
    return HttpResponse.json(db.me);
  }),
  http.get(p('/addresses'), () => HttpResponse.json(db.addresses)),
  http.post(p('/addresses'), async ({ request }) => {
    const input = (await request.json()) as AddressInput;
    if (!input.title || !input.fullText || !input.location || !input.recipientName || !input.recipientPhone)
      return err(400, 'VALIDATION', 'اطلاعات آدرس کامل نیست');
    if (!inZone(input.location)) return err(422, 'OUT_OF_ZONE', 'این محل خارج از محدوده‌ی سرویس دکون است');
    const a: Address = { ...input, id: `a${++db.seq}`, inZone: true };
    db.addresses = [...db.addresses, a];
    saveDb();
    return HttpResponse.json(a, { status: 201 });
  }),
  http.delete(p('/addresses/:id'), ({ params }) => {
    db.addresses = db.addresses.filter((a) => a.id !== params.id);
    saveDb();
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(p('/geo/zone-check'), ({ request }) => {
    const u = new URL(request.url);
    const lat = Number(u.searchParams.get('lat'));
    const lng = Number(u.searchParams.get('lng'));
    const ok = inZone({ lat, lng });
    return HttpResponse.json({ inZone: ok, cityId: ok ? 'shahreza' : undefined });
  }),

  http.get(p('/home'), async () => {
    await latency();
    return HttpResponse.json(D.home);
  }),
  http.get(p('/restaurants'), async ({ request }) => {
    await latency();
    const q = new URL(request.url).searchParams;
    const category = q.get('category');
    const tags = q.getAll('tags');
    const minRating = Number(q.get('minRating') ?? 0);
    let items = D.restaurantCards.filter((r) => {
      const meta = D.restaurantMeta[r.id!];
      if (category && meta.category !== category) return false;
      if (q.get('openNow') === 'true' && !r.open) return false;
      if (q.get('hasDiscount') === 'true' && !r.offer) return false;
      if (minRating && (r.rating ?? 0) < minRating) return false;
      if (tags.length && !tags.some((t) => meta.tags.includes(t))) return false;
      return true;
    });
    const sort = q.get('sort');
    const by: Record<string, (r: (typeof items)[number]) => number> = {
      rating: (r) => -(r.rating ?? 0),
      eta: (r) => r.etaMin ?? 0,
      fee: (r) => r.fee ?? 0,
      distance: (r) => r.distanceKm ?? 0,
    };
    if (sort && by[sort]) items = [...items].sort((a, b) => by[sort](a) - by[sort](b));
    return HttpResponse.json({ items, nextCursor: null });
  }),
  http.put(p('/favorites/restaurants/:id'), ({ params }) => {
    db.favs = [...new Set([...favIds(), String(params.id)])];
    saveDb();
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(p('/favorites/restaurants/:id'), ({ params }) => {
    db.favs = favIds().filter((id) => id !== params.id);
    saveDb();
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(p('/favorites/restaurants'), () =>
    HttpResponse.json(
      D.restaurantCards.filter((r) => favIds().includes(r.id!)).map((r) => ({ ...r, isFavorite: true })),
    ),
  ),
  http.get(p('/restaurants/:id'), ({ params }) => {
    const r = D.restaurants.find((x) => x.id === params.id);
    return r ? HttpResponse.json(r) : err(404, 'NOT_FOUND', 'رستوران پیدا نشد');
  }),
  http.get(p('/restaurants/:id/menu'), ({ params }) => HttpResponse.json(D.menus[String(params.id)] ?? [])),
  http.get(p('/foods/:id'), ({ params }) => {
    const f = D.foods.find((x) => x.id === params.id);
    return f ? HttpResponse.json(f) : err(404, 'NOT_FOUND', 'غذا پیدا نشد');
  }),
  http.get(p('/foods/:id/reviews'), ({ params, request }) => {
    const f = D.foods.find((x) => x.id === params.id);
    if (!f) return err(404, 'NOT_FOUND', 'غذا پیدا نشد');
    if (!f.reviews)
      return HttpResponse.json({
        average: 0,
        count: 0,
        distribution: [0, 0, 0, 0, 0],
        items: [],
        nextCursor: null,
      });
    const from = Number(new URL(request.url).searchParams.get('cursor') ?? 0);
    const all = D.reviewPage.items ?? [];
    const to = from + D.REVIEW_PAGE_SIZE;
    return HttpResponse.json({
      ...D.reviewPage,
      items: all.slice(from, to),
      nextCursor: to < all.length ? String(to) : null,
    });
  }),
  http.post(p('/foods/:id/reviews'), async ({ request }) => {
    const body = (await request.json()) as { stars?: number; text?: string };
    if (!body.stars || body.stars < 1 || body.stars > 5 || (body.text?.length ?? 0) > 500)
      return err(422, 'VALIDATION', 'امتیاز باید بین ۱ تا ۵ باشد');
    return new HttpResponse(null, { status: 201 });
  }),
  http.get(p('/search'), ({ request }) => {
    const q = new URL(request.url).searchParams.get('q') ?? '';
    return HttpResponse.json({
      restaurants: D.restaurantCards.filter((r) => r.name!.includes(q) || r.sub!.includes(q)),
      foods: D.foods
        .filter((f) => f.title!.includes(q))
        .map((f) => ({ food: f, restaurant: D.restaurantCards.find((r) => r.id === f.restaurantId) })),
    });
  }),
  http.get(p('/search/suggestions'), () =>
    HttpResponse.json({ recent: ['کباب'], popular: ['کباب', 'پیتزا', 'برگر'] }),
  ),
  http.get(p('/campaigns'), () => HttpResponse.json(D.campaigns)),
  http.get(p('/promos'), () => HttpResponse.json(D.promos)),

  http.post(p('/checkout/quote'), async ({ request }) =>
    HttpResponse.json(quote((await request.json()) as OrderDraft)),
  ),
  http.post(p('/orders'), async ({ request }) => {
    if (!request.headers.get('Idempotency-Key'))
      return err(400, 'IDEMPOTENCY_KEY_REQUIRED', 'کلید یکتایی ارسال نشد');
    const draft = (await request.json()) as OrderDraft;
    const q = quote(draft);
    if (q.belowMinBy) return err(409, 'MIN_ORDER', 'مبلغ سفارش از حداقل کمتر است');
    const online = draft.payMethod === 'online';
    const number = String(10300 + ++db.seq);
    const order: Order = {
      id: `o${number}`,
      number,
      status: online ? 'PENDING_PAYMENT' : 'PLACED',
      step: 0,
      restaurant: D.restaurantCards.find((r) => r.id === draft.restaurantId),
      courier: null,
      lines: q.lines as unknown as Order['lines'],
      address: db.addresses.find((a) => a.id === draft.addressId),
      recipient: (draft.recipient ?? { mode: 'self' }) as Order['recipient'],
      note: draft.note ?? '',
      payMethod: draft.payMethod,
      paymentStatus: online ? 'pending' : 'cash_due',
      totals: { items: q.itemsTotal, fee: q.deliveryFee, discount: q.discount, total: q.total },
      etaMin: q.etaMin,
      etaMax: q.etaMax,
      placedAt: new Date().toISOString(),
      canCancel: !online,
      canRate: false,
    };
    db.orders = [...db.orders, { order, placedMs: online ? null : Date.now(), rated: false }];
    saveDb();
    const body: CreateOrderResult = {
      order,
      payment: online
        ? {
            provider: 'zibal',
            redirectUrl: `mock-gateway://${order.id}`,
            expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
          }
        : null,
    };
    return HttpResponse.json(body, { status: 201 });
  }),
  http.get(p('/orders'), ({ request }) => {
    const tab = new URL(request.url).searchParams.get('tab');
    const items = allOrders().filter((o) => {
      if (o.status === 'PENDING_PAYMENT') return false;
      const final = FINAL_STATUSES.includes(o.status ?? '');
      return tab === 'past' ? final : tab === 'active' ? !final : true;
    });
    return HttpResponse.json({ items, nextCursor: null });
  }),
  http.get(p('/orders/:id/reorder'), ({ params }) => {
    const o = allOrders().find((x) => x.id === params.id);
    if (!o) return err(404, 'NOT_FOUND', 'سفارش پیدا نشد');
    const lines = (o.lines as unknown as { foodId: string; qty: number }[]).map((l) => ({
      foodId: l.foodId,
      qty: l.qty,
    }));
    return HttpResponse.json(
      quote({ restaurantId: o.restaurant?.id ?? '', lines, addressId: '', payMethod: 'online' }),
    );
  }),
  http.get(p('/orders/:id'), ({ params }) => {
    const m = findOrder(params.id);
    if (m) return HttpResponse.json(liveOrder(m));
    const o = D.orders.find((x) => x.id === params.id);
    return o ? HttpResponse.json(o) : err(404, 'NOT_FOUND', 'سفارش پیدا نشد');
  }),
  // Mock of the server side of the gateway return: the real server verifies with the gateway, then
  // redirects the user. The fake gateway screen calls it directly, then re-reads the order.
  http.get(p('/payments/callback/:provider'), ({ request }) => {
    const q = new URL(request.url).searchParams;
    const m = findOrder(q.get('orderId'));
    if (!m) return err(404, 'NOT_FOUND', 'سفارش پیدا نشد');
    if (m.order.status === 'PENDING_PAYMENT') {
      if (q.get('result') === 'ok') {
        m.order = { ...m.order, status: 'PLACED', paymentStatus: 'paid', placedAt: new Date().toISOString() };
        m.placedMs = Date.now();
      } else m.order = { ...m.order, paymentStatus: 'failed' };
      saveDb();
    }
    return HttpResponse.json({ orderId: m.order.id, result: q.get('result') });
  }),
  http.post(p('/orders/:id/payment/retry'), ({ params }) => {
    const m = findOrder(params.id);
    if (!m || m.order.status !== 'PENDING_PAYMENT')
      return err(409, 'NOT_PAYABLE', 'این سفارش قابل پرداخت نیست');
    m.order = { ...m.order, paymentStatus: 'pending' };
    saveDb();
    return HttpResponse.json({
      provider: 'zibal',
      redirectUrl: `mock-gateway://${m.order.id}`,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
  }),
  http.post(p('/orders/:id/cancel'), async ({ params, request }) => {
    const m = findOrder(params.id);
    if (!m) return err(404, 'NOT_FOUND', 'سفارش پیدا نشد');
    const body = (await request.json()) as { reasonId?: string };
    if (!body.reasonId) return err(400, 'VALIDATION', 'دلیل لغو را انتخاب کنید');
    if (!liveOrder(m).canCancel)
      return err(409, 'NOT_CANCELABLE', 'رستوران سفارش را پذیرفته و دیگر قابل لغو نیست');
    m.order = {
      ...m.order,
      status: 'CANCELED_BY_CUSTOMER',
      paymentStatus: m.order.payMethod === 'online' ? 'refunded' : 'none',
    };
    m.placedMs = null;
    saveDb();
    return HttpResponse.json({});
  }),
  http.post(p('/orders/:id/rating'), async ({ params, request }) => {
    const m = findOrder(params.id);
    if (!m) return err(404, 'NOT_FOUND', 'سفارش پیدا نشد');
    const body = (await request.json()) as { restaurantStars?: number };
    if (!body.restaurantStars) return err(400, 'VALIDATION', 'امتیاز رستوران الزامی است');
    if (!liveOrder(m).canRate)
      return err(409, 'NOT_RATEABLE', 'این سفارش قبلاً امتیاز گرفته یا هنوز تحویل نشده است');
    m.rated = true;
    saveDb();
    return new HttpResponse(null, { status: 201 });
  }),
  http.post(p('/orders/:id/report'), async ({ params, request }) => {
    if (!findOrder(params.id) && !D.orders.some((o) => o.id === params.id))
      return err(404, 'NOT_FOUND', 'سفارش پیدا نشد');
    const body = (await request.json()) as { typeId?: string; text?: string };
    if (!body.typeId || !body.text?.trim()) return err(400, 'VALIDATION', 'نوع مشکل و توضیح الزامی است');
    return new HttpResponse(null, { status: 201 });
  }),
  http.get(p('/notifications'), () =>
    HttpResponse.json({
      items: D.notifications.map((n) => ({ ...n, read: db.read.includes(n.id) })),
      nextCursor: null,
    }),
  ),
  http.post(p('/notifications/read'), async ({ request }) => {
    const body = (await request.json()) as { ids?: string[]; all?: boolean };
    const ids = body.all ? D.notifications.map((n) => n.id) : (body.ids ?? []);
    db.read = [...new Set([...db.read, ...ids])];
    saveDb();
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(p('/me/settings'), () => HttpResponse.json(db.settings)),
  http.put(p('/me/settings'), async ({ request }) => {
    db.settings = { ...db.settings, ...((await request.json()) as Partial<MockDb['settings']>) };
    saveDb();
    return HttpResponse.json(db.settings);
  }),
  http.delete(p('/me'), () => {
    db = freshDb();
    saveDb();
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(p('/support/info'), () => HttpResponse.json(D.supportInfo)),
  http.get(p('/content/:key'), ({ params }) => {
    const c = D.content[String(params.key)];
    return c ? HttpResponse.json(c) : err(404, 'NOT_FOUND', 'صفحه پیدا نشد');
  }),
  http.get(p('/me/invite'), () => HttpResponse.json(D.invite)),
  http.post(p('/support/messages'), async ({ request }) => {
    const body = (await request.json()) as { text?: string };
    if (!body.text?.trim()) return err(400, 'VALIDATION', 'متن پیام را بنویسید');
    return new HttpResponse(null, { status: 201 });
  }),
  http.post(p('/partner-requests'), async ({ request }) => {
    const b = (await request.json()) as { kind?: string; name?: string; phone?: string; cityId?: string };
    if (!b.kind || !b.name || !b.phone || !b.cityId) return err(400, 'VALIDATION', 'اطلاعات کامل نیست');
    if (!/^09\d{9}$/.test(b.phone)) return err(400, 'PHONE_INVALID', 'شماره موبایل معتبر نیست');
    return new HttpResponse(null, { status: 201 });
  }),
  http.post(p('/uploads'), async ({ request }) => {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) return err(400, 'VALIDATION', 'فایلی ارسال نشد');
    if (file.size > 5 * 1024 * 1024) return err(413, 'TOO_LARGE', 'حجم عکس باید کمتر از ۵ مگابایت باشد');
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return err(415, 'TYPE', 'فقط عکس jpeg، png یا webp');
    db.seq += 1;
    return HttpResponse.json({ id: `up${db.seq}`, url: `mock-upload://up${db.seq}` }, { status: 201 });
  }),
];
