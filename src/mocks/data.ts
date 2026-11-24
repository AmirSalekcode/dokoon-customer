/**
 * Sample data for the mock server (MSW). Shapes follow contract/dokoon-openapi.yaml.
 * Content mirrors the prototype (App.dc.html) and is replaceable by the real API.
 * `art` is a prototype-only illustration id carried in imageUrl as `art:dk-*` until real photos exist.
 */
import type {
  AppConfig,
  Campaign,
  City,
  Food,
  Home,
  MenuCategory,
  Order,
  Promo,
  Restaurant,
  RestaurantCard,
  ReviewPage,
  User,
} from '@/api/types';
import { isActive } from '@/lib/discount';
import { toFaDigits } from '@/lib/format';

export const appConfig: AppConfig = {
  minVersion: '0.1.0',
  maintenance: false,
  maps: ['neshan', 'balad'],
  defaultMap: 'neshan',
  features: { guestBrowsing: true },
};

export const cities: City[] = [{ id: 'shahreza', name: 'شهرضا', center: { lat: 32.0089, lng: 51.8668 } }];

export const user: User = {
  id: 'u1',
  phone: '09131234567',
  name: 'امیر',
  cityId: 'shahreza',
  unreadNotifications: 2,
  activeOrders: 1,
};

const card = (r: Restaurant): RestaurantCard => {
  const {
    address: _a,
    location: _l,
    hours: _h,
    phone: _p,
    allowExtras: _e,
    allowCash: _c,
    hasMenu: _m,
    ...c
  } = r;
  return c;
};

export const restaurants: Restaurant[] = [
  {
    id: 'naghsh',
    name: 'کباب‌سرای نقش‌جهان',
    sub: 'کباب، چلو، خورشت',
    coverUrl: 'art:dk-chelo',
    rating: 4.8,
    reviews: 245,
    etaMin: 25,
    etaMax: 35,
    fee: 45000,
    distanceKm: 1.2,
    open: true,
    opensNext: '',
    badge: { text: 'پرفروش', tone: 'red' },
    offer: '۱۵٪ تخفیف روی اولین سفارش شما',
    isFavorite: true,
    address: 'شهرضا، خیابان امام، نبش کوچه‌ی ۴',
    location: { lat: 32.0102, lng: 51.8651 },
    hours: '۱۱:۰۰ تا ۲۳:۰۰',
    phone: '03100000001',
    allowExtras: true,
    allowCash: true,
    hasMenu: true,
  },
  {
    id: 'burger',
    name: 'برگر لاین',
    sub: 'برگر، پیتزا، سیب‌زمینی',
    coverUrl: 'art:dk-burger',
    rating: 4.6,
    reviews: 156,
    etaMin: 20,
    etaMax: 30,
    fee: 0,
    distanceKm: 0.8,
    open: true,
    opensNext: '',
    badge: { text: '۱۵٪ تخفیف', tone: 'red' },
    offer: '۱۵٪ تخفیف روی همه‌ی برگرها',
    isFavorite: false,
    address: 'شهرضا، بلوار مطهری، روبه‌روی پارک',
    location: { lat: 32.0061, lng: 51.8702 },
    hours: '۱۰:۰۰ تا ۲۴:۰۰',
    phone: '03100000002',
    allowExtras: false,
    allowCash: false,
    hasMenu: true,
  },
  {
    id: 'cafe',
    name: 'کافه گلستان',
    sub: 'قهوه، کیک، دسر',
    coverUrl: 'art:dk-cafe',
    rating: 4.4,
    reviews: 88,
    etaMin: 15,
    etaMax: 25,
    fee: 25000,
    distanceKm: 2.1,
    open: false,
    opensNext: 'فردا ساعت ۹:۰۰',
    badge: { text: 'جدید', tone: 'green' },
    offer: '',
    isFavorite: false,
    address: 'شهرضا، خیابان امام، کنار کتابخانه',
    location: { lat: 32.0123, lng: 51.8611 },
    hours: '۹:۰۰ تا ۲۲:۰۰',
    phone: '03100000003',
    allowExtras: true,
    allowCash: true,
    hasMenu: true,
  },
];

export const restaurantCards: RestaurantCard[] = restaurants.map(card);

/** Mock-only facets for filtering GET /restaurants (category / food tags are server-side concepts). */
export const restaurantMeta: Record<string, { category: string; tags: string[] }> = {
  naghsh: { category: 'iranian', tags: ['kebab', 'chelo', 'stew'] },
  burger: { category: 'fast', tags: ['burger', 'pizza', 'fries'] },
  cafe: { category: 'cafe', tags: ['cafe', 'cake'] },
};

const food = (f: Food): Food => ({
  available: true,
  oldPrice: null,
  discount: null,
  optionGroups: [],
  rating: 0,
  reviews: 0,
  ...f,
});

/** Sample festival (D-131): ends three days after the mock starts. */
const festivalEnds = new Date(Date.now() + 3 * 86_400_000).toISOString();

export const foods: Food[] = [
  food({
    id: 'n1',
    restaurantId: 'naghsh',
    title: 'چلو کباب کوبیده',
    desc: 'دو سیخ کوبیده‌ی گوشت گوسفندی با برنج ایرانی، گوجه و پیاز کبابی',
    price: 285000,
    oldPrice: 320000,
    discount: { percent: 10, label: 'special', endsAt: null },
    imageUrl: 'art:dk-chelo',
    rating: 4.8,
    reviews: 124,
    optionGroups: [
      {
        id: 'extra',
        title: 'افزودنی‌ها',
        required: false,
        min: 0,
        max: 3,
        isExtra: true,
        options: [
          { id: 'rice', title: 'برنج اضافه', priceDelta: 45000, available: true },
          { id: 'butter', title: 'کره', priceDelta: 10000, available: true },
        ],
      },
    ],
  }),
  food({
    id: 'n2',
    restaurantId: 'naghsh',
    title: 'کباب برگ',
    desc: 'فیله‌ی گوسفندی مزه‌دارشده با زعفران',
    price: 420000,
    imageUrl: 'art:dk-kebab',
    rating: 4.9,
    reviews: 80,
  }),
  food({
    id: 'n5',
    restaurantId: 'naghsh',
    title: 'خورشت قیمه',
    desc: 'قیمه با لپه و سیب‌زمینی سرخ‌کرده',
    price: 190000,
    imageUrl: 'art:dk-stew',
    available: false,
  }),
  food({
    id: 'b1',
    restaurantId: 'burger',
    title: 'چیزبرگر دوبل',
    desc: 'دو لایه گوشت، پنیر چدار، سس مخصوص',
    price: 260000,
    oldPrice: 325000,
    discount: { percent: 20, label: 'festival', endsAt: festivalEnds },
    imageUrl: 'art:dk-burger',
    rating: 4.6,
    reviews: 61,
    optionGroups: [
      {
        id: 'fries',
        title: 'اندازه‌ی سیب‌زمینی',
        required: true,
        min: 1,
        max: 1,
        isExtra: false,
        options: [
          { id: 's', title: 'کوچک', priceDelta: 0, available: true },
          { id: 'm', title: 'متوسط', priceDelta: 20000, available: true },
          { id: 'l', title: 'بزرگ', priceDelta: 40000, available: true },
        ],
      },
    ],
  }),
  food({
    id: 'b4',
    restaurantId: 'burger',
    title: 'پیتزا پپرونی',
    desc: 'خمیر نازک، پنیر موزارلا، پپرونی',
    price: 310000,
    imageUrl: 'art:dk-pizza',
  }),
  food({
    id: 'c1',
    restaurantId: 'cafe',
    title: 'کیک شکلاتی',
    desc: 'برش کیک شکلاتی خانگی',
    price: 95000,
    imageUrl: 'art:dk-cake',
  }),
];

/**
 * Dev/E2E only: localStorage `dk-mock-ended-discounts` = comma-separated food ids whose discount the mock
 * treats as ended (to show «قیمت یا موجودی تغییر کرد» when a discount ends while the food is in the cart).
 */
function forcedEnded(): string[] {
  try {
    return (globalThis.localStorage?.getItem('dk-mock-ended-discounts') ?? '').split(',').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * A food as the server sends it now: a discount that has ended is gone (D-131), so the customer pays the
 * base price again. The cart learns about it from POST /checkout/quote (PRICE_CHANGED).
 */
export function liveFood(f: Food, now: number = Date.now()): Food {
  if (!f.discount || (isActive(f.discount.endsAt, now) && !forcedEnded().includes(f.id!))) return f;
  return { ...f, price: f.oldPrice ?? f.price, oldPrice: null, discount: null };
}

/** Highest running food discount of a restaurant (0 = none). */
export function maxFoodDiscount(restaurantId: string, now: number = Date.now()): number {
  return Math.max(
    0,
    ...foods
      .filter((f) => f.restaurantId === restaurantId)
      .map((f) => liveFood(f, now).discount?.percent ?? 0),
  );
}

// Restaurants with a discounted food get the server badge «تا X٪ تخفیف» (contract-notes §39).
for (const list of [restaurants, restaurantCards])
  for (const r of list) {
    const pct = maxFoodDiscount(r.id!);
    if (pct) r.badge = { text: `تا ${toFaDigits(pct)}٪ تخفیف`, tone: 'red' };
  }

export const menus: Record<string, MenuCategory[]> = {
  naghsh: [
    { id: 'best', title: 'پرفروش‌ها', foods: foods.filter((f) => ['n1', 'n2'].includes(f.id!)) },
    { id: 'stew', title: 'خورشت‌ها', foods: foods.filter((f) => f.id === 'n5') },
  ],
  burger: [
    { id: 'burgers', title: 'برگرها', foods: foods.filter((f) => f.id === 'b1') },
    { id: 'pizza', title: 'پیتزاها', foods: foods.filter((f) => f.id === 'b4') },
  ],
  cafe: [{ id: 'dessert', title: 'دسر', foods: foods.filter((f) => f.id === 'c1') }],
};

export const campaigns: Campaign[] = [
  {
    id: 'b1',
    title: 'کباب داغ، دم در خونه‌ات',
    text: 'کباب‌های داغ و تازه را از بهترین کبابی‌های شهرضا سفارش دهید.',
    imageUrl: 'art:dk-kebab',
    restaurantIds: ['naghsh'],
  },
  {
    id: 'b2',
    title: 'برگر و پیتزای داغ',
    text: 'برگر و پیتزای داغ با ارسال سریع تا ۳۰ دقیقه.',
    imageUrl: 'art:dk-burger',
    restaurantIds: ['burger'],
  },
  {
    id: 'b3',
    title: 'هفته‌ی طعم‌های شهرضا',
    text: 'این هفته از رستوران‌های شرکت‌کننده سفارش دهید و پیشنهادهای ویژه‌ی هر رستوران را ببینید.',
    imageUrl: 'art:dk-mix',
    restaurantIds: ['naghsh', 'burger', 'cafe'],
  },
];

export const home: Home = {
  banners: campaigns,
  categories: [
    { id: 'all', title: 'همه', imageUrl: 'art:dk-mix' },
    { id: 'fast', title: 'فست‌فود', imageUrl: 'art:dk-burger' },
    { id: 'iranian', title: 'ایرانی', imageUrl: 'art:dk-chelo' },
    { id: 'cafe', title: 'کافه', imageUrl: 'art:dk-cafe' },
  ],
  sections: [
    { id: 'near', title: 'نزدیک شما', restaurants: restaurantCards },
    {
      id: 'top',
      title: 'محبوب‌ترین‌ها',
      restaurants: [...restaurantCards].sort((a, b) => b.rating! - a.rating!),
    },
  ],
};

export const promos: Promo[] = [
  { code: 'DOKOON10', title: '۱۰٪ تخفیف دکون', sub: 'تا ۵۰ هزار تومان روی همه‌ی سفارش‌ها', badge: '۱۰٪' },
  { code: 'FIRST20', title: '۲۰٪ تخفیف اولین سفارش', sub: 'فقط برای اولین سفارش', badge: '۲۰٪' },
];

const REVIEWERS = [
  'مریم',
  'علی',
  'زهرا',
  'رضا',
  'نرگس',
  'حسین',
  'سارا',
  'مهدی',
  'فاطمه',
  'امیر',
  'لیلا',
  'محسن',
];
const REVIEW_TEXTS = [
  'گوشت کاملاً نرم و آبدار بود.',
  'کوبیده‌اش از همه‌جای شهر بهتر است.',
  'به‌موقع رسید و هنوز داغ بود.',
  'برنج عالی بود، کمی نمک بیشتر می‌خواست.',
];

/** All reviews of a food with reviews (n1 in tests): 12 items, served 5 per page by the mock. */
export const reviewPage: ReviewPage = {
  average: 4.8,
  count: 124,
  distribution: [107, 11, 4, 1, 1],
  items: REVIEWERS.map((userName, i) => ({
    id: `r${i + 1}`,
    userName,
    stars: i % 5 === 3 ? 4 : 5,
    text: REVIEW_TEXTS[i % REVIEW_TEXTS.length],
    createdAt: new Date(Date.UTC(2026, 10, 15 - i, 12)).toISOString(),
  })),
  nextCursor: null,
};

export const REVIEW_PAGE_SIZE = 5;

export const orders: Order[] = [
  {
    id: 'o1',
    number: '10254',
    status: 'PREPARING',
    step: 2,
    restaurant: restaurantCards[0],
    courier: null,
    // Contract gap: Order.lines items are untyped ({type: object}) — see docs/contract-notes.md.
    lines: [
      { foodId: 'n1', title: 'چلو کباب کوبیده', qty: 2, unitPrice: 285000 },
    ] as unknown as Order['lines'],
    payMethod: 'online',
    paymentStatus: 'paid',
    totals: { items: 570000, fee: 45000, discount: 0, total: 615000 },
    etaMin: 25,
    etaMax: 35,
    placedAt: '2026-11-18T09:30:00Z',
    canCancel: false,
    canRate: false,
  },
  {
    id: 'o0',
    number: '10198',
    status: 'DELIVERED',
    step: 4,
    restaurant: restaurantCards[1],
    courier: null,
    lines: [
      { foodId: 'b4', title: 'پیتزا پپرونی', qty: 1, unitPrice: 310000, total: 310000 },
    ] as unknown as Order['lines'],
    payMethod: 'cash',
    paymentStatus: 'cash_collected',
    totals: { items: 310000, fee: 0, discount: 0, total: 310000 },
    etaMin: 30,
    etaMax: 40,
    placedAt: '2026-11-12T18:10:00Z',
    canCancel: false,
    canRate: false,
  },
];

export const notifications = [
  {
    id: 'nt1',
    title: 'سفارش شما در حال آماده شدن است',
    body: 'آشپزهای کباب‌سرای نقش‌جهان مشغول آماده‌سازی هستند.',
    createdAt: '2026-11-18T09:35:00Z',
    target: { screen: 'track', id: 'o1' },
  },
  {
    id: 'nt2',
    title: '۱۵٪ تخفیف اولین سفارش از کباب‌سرای نقش‌جهان',
    body: 'فقط تا آخر هفته.',
    createdAt: '2026-11-17T12:00:00Z',
    target: { screen: 'restaurant', id: 'naghsh' },
  },
  {
    id: 'nt3',
    title: 'به دکون خوش آمدید',
    body: 'غذای خوب شهرضا، دم در خانه‌ی شما.',
    createdAt: '2026-11-10T08:00:00Z',
    target: null,
  },
];

// ---- support, content, invite (texts from the prototype; payment wording updated for cash, D-38/v48) ----
export const supportInfo = {
  contacts: [
    { title: 'تماس تلفنی با پشتیبانی', sub: 'همه‌ی روزها از ۹ صبح تا ۱۱ شب', href: 'tel:+983100000000' },
    { title: 'پشتیبانی در واتس‌اپ', sub: 'پاسخ در کمتر از ۳۰ دقیقه', href: 'https://wa.me/983100000000' },
  ],
  faqs: [
    {
      q: 'چطور سفارش را پیگیری کنم؟',
      a: 'از تب «حساب» وارد «سفارش‌ها» شوید و روی سفارش فعال بزنید. مراحل تأیید، آماده‌سازی و ارسال را لحظه‌به‌لحظه می‌بینید.',
    },
    {
      q: 'چه زمانی می‌توانم سفارش را لغو کنم؟',
      a: 'تا قبل از تأیید رستوران می‌توانید از صفحه‌ی پیگیری سفارش آن را لغو کنید. بعد از تأیید، لغو فقط با پشتیبانی ممکن است.',
    },
    {
      q: 'پرداخت چگونه انجام می‌شود؟',
      a: 'آنلاین از طریق درگاه امن بانکی، یا نقدی هنگام تحویل به پیک (اگر رستوران پرداخت نقدی را پذیرفته باشد).',
    },
    {
      q: 'اگر غذا کامل یا درست نرسید چه کنم؟',
      a: 'از صفحه‌ی پیگیری سفارش گزینه‌ی «گزارش مشکل» را بزنید و مشکل را بنویسید. پشتیبانی بررسی می‌کند و با شما تماس می‌گیرد.',
    },
    {
      q: 'کد تخفیف را کجا وارد کنم؟',
      a: 'کد را در سبد خرید یا از بخش «کدهای تخفیف» وارد کنید. مبلغ تخفیف قبل از پرداخت نمایش داده می‌شود.',
    },
  ],
  socials: [
    { title: 'اینستاگرام', handle: '@dokoon.app', url: 'https://instagram.com/dokoon.app' },
    { title: 'تلگرام', handle: '@dokoon_app', url: 'https://t.me/dokoon_app' },
    { title: 'ایتا', handle: '@dokoon_app', url: 'https://eitaa.com/dokoon_app' },
    { title: 'آپارات', handle: 'dokoon', url: 'https://aparat.com/dokoon' },
  ],
};

/** Draft legal/about texts (need legal review). Body format: «## heading» lines start sections. */
export const content: Record<string, { title: string; body: string; version: string }> = {
  about: {
    title: 'درباره‌ی دکون',
    body: 'دکون سفارش آنلاین غذا از رستوران‌ها و کافه‌های شهر شماست. ما رستوران‌های محلی را با پیک سریع و پرداخت امن به شما می‌رسانیم.',
    version: 'draft-1',
  },
  terms: {
    title: 'قوانین و مقررات',
    body: [
      '## شرایط استفاده',
      'با استفاده از دکون، این قوانین را می‌پذیرید. اطلاعات واردشده باید درست و کامل باشد.',
      '## ثبت و لغو سفارش',
      'سفارش آنلاین پس از پرداخت موفق و سفارش نقدی بلافاصله ثبت می‌شود. لغو تا قبل از تأیید رستوران امکان‌پذیر است.',
      '## پرداخت و بازگشت وجه',
      'پرداخت آنلاین یا نقدی هنگام تحویل است. در صورت لغو یا پرداخت ناموفق، مبلغ آنلاین طبق زمان‌بندی بانک بازگردانده می‌شود.',
      '## مسئولیت کیفیت غذا',
      'کیفیت و آماده‌سازی غذا بر عهده‌ی رستوران است. در صورت مشکل، از بخش «گزارش مشکل» اطلاع دهید.',
    ].join('\n'),
    version: 'draft-1',
  },
  privacy: {
    title: 'حریم خصوصی',
    body: [
      '## اطلاعاتی که جمع می‌کنیم',
      'نام، شماره‌ی موبایل، آدرس‌های تحویل و سابقه‌ی سفارش‌ها برای ارائه‌ی خدمات.',
      '## نحوه‌ی استفاده',
      'اطلاعات فقط برای ثبت، ارسال و پشتیبانی سفارش و بهبود دکون استفاده می‌شود.',
      '## اشتراک‌گذاری',
      'اطلاعات لازم برای تحویل با رستوران و پیک به اشتراک گذاشته می‌شود و به اشخاص دیگر فروخته نمی‌شود.',
    ].join('\n'),
    version: 'draft-1',
  },
};

export const invite = {
  code: 'DOKOON-AMIR',
  link: 'https://dokoonapp.ir/i/DOKOON-AMIR',
  text: 'با کد DOKOON-AMIR در دکون ثبت‌نام کن؛ بعد از اولین سفارش هر دوی ما کد تخفیف می‌گیریم.',
};
