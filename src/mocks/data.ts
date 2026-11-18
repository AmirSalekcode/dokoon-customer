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
    minOrder: 150000,
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
    minOrder: 120000,
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
    minOrder: 80000,
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
  optionGroups: [],
  rating: 0,
  reviews: 0,
  ...f,
});

export const foods: Food[] = [
  food({
    id: 'n1',
    restaurantId: 'naghsh',
    title: 'چلو کباب کوبیده',
    desc: 'دو سیخ کوبیده‌ی گوشت گوسفندی با برنج ایرانی، گوجه و پیاز کبابی',
    price: 285000,
    oldPrice: 320000,
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
];
