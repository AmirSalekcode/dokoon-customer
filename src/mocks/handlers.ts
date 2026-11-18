import { delay, http, HttpResponse } from 'msw';
import type { ApiErrorBody, AuthResult, CreateOrderResult, OrderDraft, Quote } from '@/api/types';
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

  http.get(p('/me'), () => HttpResponse.json(D.user)),
  http.patch(p('/me'), async ({ request }) => {
    const patch = (await request.json()) as { name?: string; referralCode?: string; cityId?: string };
    if (patch.referralCode && !/^DOKOON-[A-Z0-9]+$/.test(patch.referralCode))
      return err(400, 'REF_INVALID', 'کد معرف معتبر نیست.');
    return HttpResponse.json({
      // Only echo what changed; the mock does not know which user is calling.
      name: patch.name,
      cityId: patch.cityId,
    });
  }),
  http.get(p('/addresses'), () => HttpResponse.json([])),
  http.get(p('/geo/zone-check'), ({ request }) => {
    const u = new URL(request.url);
    const lat = Number(u.searchParams.get('lat'));
    const lng = Number(u.searchParams.get('lng'));
    const c = D.cities[0].center!;
    const inZone = Math.hypot(lat - c.lat, lng - c.lng) < 0.05;
    return HttpResponse.json({ inZone, cityId: inZone ? 'shahreza' : undefined });
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
  http.put(p('/favorites/restaurants/:id'), () => new HttpResponse(null, { status: 204 })),
  http.delete(p('/favorites/restaurants/:id'), () => new HttpResponse(null, { status: 204 })),
  http.get(p('/favorites/restaurants'), () =>
    HttpResponse.json(D.restaurantCards.filter((r) => r.isFavorite)),
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
  http.get(p('/foods/:id/reviews'), () => HttpResponse.json(D.reviewPage)),
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
    const body: CreateOrderResult = {
      order: {
        ...D.orders[0],
        id: 'o-new',
        status: online ? 'PENDING_PAYMENT' : 'PLACED',
        step: 0,
        payMethod: draft.payMethod,
        paymentStatus: online ? 'pending' : 'cash_due',
      },
      payment: online
        ? { provider: 'zibal', redirectUrl: 'about:blank#mock-gateway', expiresAt: '2026-11-18T10:00:00Z' }
        : null,
    };
    return HttpResponse.json(body, { status: 201 });
  }),
  http.get(p('/orders'), () => HttpResponse.json({ items: D.orders, nextCursor: null })),
  http.get(p('/orders/:id'), ({ params }) => {
    const o = D.orders.find((x) => x.id === params.id);
    return o ? HttpResponse.json(o) : err(404, 'NOT_FOUND', 'سفارش پیدا نشد');
  }),
  http.get(p('/notifications'), () =>
    HttpResponse.json({
      items: [
        {
          id: 'n1',
          title: 'سفارش شما در حال آماده شدن است',
          body: 'آشپزهای کباب‌سرای نقش‌جهان مشغول آماده‌سازی هستند.',
          read: false,
          createdAt: '2026-11-18T09:35:00Z',
          target: { screen: 'track', id: 'o1' },
        },
      ],
      nextCursor: null,
    }),
  ),
  http.get(p('/support/info'), () => HttpResponse.json({ contacts: [], faqs: [], socials: [] })),
  http.get(p('/content/:key'), ({ params }) =>
    HttpResponse.json({ title: String(params.key), body: 'متن پیش‌نویس', version: '0' }),
  ),
];
