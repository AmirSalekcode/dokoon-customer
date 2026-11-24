import type {
  DayHours,
  DocType,
  Food,
  FoodDiscount,
  MenuCategory,
  Notification,
  OptionGroup,
  Order,
  RejectReason,
  Report,
  RestaurantProfile,
  RestaurantSettings,
  Settlement,
} from '../api/types';

/**
 * Sample data for the restaurant mock API, taken from the restaurant prototype
 * (prototype-restaurant/App.dc.html). Wire format = contract: ASCII digits, integer toman, ISO times;
 * the app formats Persian digits. Times are relative to `now` so the demo always looks fresh.
 */
const MIN = 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

export const OTP_CODE = '1234';
/**
 * Demo phones for every registration status (any other valid phone = active restaurant).
 * `new` = no restaurant for this phone yet → registration wizard (proposed status, contract-notes 26).
 */
export type DemoStatus = 'new' | 'pending' | 'needs_docs' | 'rejected';
export const DEMO_STATUS_PHONES: Record<string, DemoStatus> = {
  '09130000000': 'new',
  '09130000001': 'pending',
  '09130000002': 'needs_docs',
  '09130000003': 'rejected',
};
export const DEMO_REJECT_REASON = 'تصویر مجوز کسب خوانا نبود؛ لطفاً دوباره ثبت‌نام کنید.';
export const DEMO_MISSING_DOCS = ['lic'];
export const ACCEPT_TIMEOUT_SEC = 180;

export const appConfig = { minVersion: '0.0.0', maintenance: false };

export const profile: RestaurantProfile = {
  id: 'rest-zagros',
  name: 'کبابی سنتی زاگرس',
  ownerName: 'مهدی رضایی',
  phoneMasked: '0913•••4567',
  address: 'شهرضا، خیابان امام، نبش کوچه‌ی 12',
  lat: 32.0086,
  lng: 51.8668,
  shebaMasked: 'IR62 **** **** **** **** 4567',
  rating: 4.7,
  reviewCount: 1240,
  open: true,
  commissionPercent: 12,
  pendingShebaChange: false,
};

export const docTypes: DocType[] = [
  {
    id: 'lic',
    label: 'مجوز کسب',
    hint: 'عکس یا PDF',
    required: true,
    accept: ['image/jpeg', 'image/png', 'application/pdf'],
    maxMb: 10,
    stage: 'registration',
    uploaded: false,
  },
  {
    id: 'nid',
    label: 'کارت ملی مدیر',
    hint: 'عکس واضح',
    required: true,
    accept: ['image/jpeg', 'image/png'],
    maxMb: 5,
    stage: 'registration',
    uploaded: false,
  },
  {
    id: 'logo',
    label: 'لوگو و عکس رستوران',
    hint: 'اختیاری',
    required: false,
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    maxMb: 5,
    stage: 'registration',
    uploaded: false,
  },
];

export const rejectReasons: Required<RejectReason>[] = [
  { id: 'r1', label: 'مواد اولیه تمام شده' },
  { id: 'r2', label: 'رستوران شلوغ است' },
  { id: 'r3', label: 'نزدیک ساعت بسته شدن' },
  { id: 'r4', label: 'آدرس خارج از محدوده است' },
];

export const hours: DayHours[] = [
  { day: 0, on: true, from: '11:00', to: '23:00' },
  { day: 1, on: true, from: '11:00', to: '23:00' },
  { day: 2, on: true, from: '11:00', to: '23:00' },
  { day: 3, on: true, from: '11:00', to: '23:00' },
  { day: 4, on: true, from: '11:00', to: '23:30' },
  { day: 5, on: true, from: '11:00', to: '00:30' },
  { day: 6, on: false, from: '12:00', to: '23:00' },
];

export const settings: RestaurantSettings = {
  allowCash: true,
  allowExtras: true,
  etaMin: 30,
  etaMax: 45,
  acceptTimeoutSec: ACCEPT_TIMEOUT_SEC,
};

export const categories: MenuCategory[] = [
  { id: 'kebab', label: 'کباب‌ها', sort: 1 },
  { id: 'chelo', label: 'چلوخورش', sort: 2 },
  { id: 'side', label: 'پیش‌غذا و نوشیدنی', sort: 3 },
];

const opt = (id: string, name: string, price: number) => ({ id, name, price });
const extras: OptionGroup = {
  id: 'extra',
  title: 'افزودنی‌ها',
  required: false,
  max: 3,
  options: [opt('a', 'برنج اضافه', 45000), opt('b', 'کره', 10000), opt('c', 'نان سنگک', 15000)],
};
const drink: OptionGroup = {
  id: 'drink',
  title: 'نوشیدنی',
  required: false,
  max: 1,
  options: [opt('a', 'دوغ محلی', 25000), opt('b', 'نوشابه', 20000)],
};
const rice: OptionGroup = {
  id: 'size',
  title: 'نوع برنج',
  required: true,
  max: 1,
  options: [opt('a', 'چلو ساده', 0), opt('b', 'ته‌چین', 20000)],
};

const dish = (
  id: string,
  categoryId: string,
  name: string,
  price: number,
  discount: FoodDiscount | null,
  art: string,
  description: string,
  groups: OptionGroup[],
  available = true,
): Food => ({
  id,
  categoryId,
  name,
  price,
  discount,
  art,
  description,
  groups,
  available,
  photo: { status: id === 'm1' ? 'approved' : 'none' },
});

/** Sample festival (D-131): ends three days after the mock starts; the mock drops it once ended. */
const festivalEnds = new Date(Date.now() + 3 * 86_400_000).toISOString();

export const foods: Food[] = [
  dish(
    'm1',
    'kebab',
    'چلوکباب کوبیده',
    320000,
    { price: 285000, label: 'special', endsAt: null },
    'dk-kebab',
    'دو سیخ کوبیده‌ی گوسفندی با برنج ایرانی و گوجه کبابی',
    [rice, extras, drink],
  ),
  dish('m2', 'kebab', 'جوجه‌کباب با استخوان', 265000, null, 'dk-kebab', 'سینه و ران مرغ زعفرانی با برنج', [
    rice,
    drink,
  ]),
  dish(
    'm3',
    'kebab',
    'چلوکباب برگ',
    395000,
    { price: 355000, label: 'festival', endsAt: festivalEnds },
    'dk-kebab',
    'برگ گوسفندی ممتاز با برنج و کره',
    [rice, extras],
  ),
  dish('m4', 'chelo', 'قورمه‌سبزی', 240000, null, 'dk-stew', 'خورش سنتی با گوشت و لوبیا قرمز', [rice]),
  dish('m5', 'chelo', 'قیمه‌ی نثار', 255000, null, 'dk-stew', 'قیمه با زرشک و پسته', [rice], false),
  dish('m6', 'side', 'سالاد شیرازی', 45000, null, 'dk-salad', 'خیار، گوجه و پیاز', []),
  dish('m7', 'side', 'دوغ محلی', 25000, null, 'dk-drink', 'دوغ گازدار', []),
];

const item = (qty: number, name: string, optionsText: string, price: number) => ({
  qty,
  name,
  optionsText,
  price,
});

interface Seed {
  id: string;
  no: string;
  status: NonNullable<Order['status']>;
  min: number;
  name: string;
  area: string;
  phone: string;
  items: ReturnType<typeof item>[];
  note?: string;
  payment: 'online' | 'cash';
  prep?: number;
  courier?: { name: string; statusText: string };
  reason?: string;
}

const SEEDS: Seed[] = [
  {
    id: 'o1',
    no: '1248',
    status: 'new',
    min: 0,
    name: 'سارا احمدی',
    area: 'شهرضا، خیابان امام',
    phone: '0913•••4567',
    items: [item(2, 'چلوکباب کوبیده', 'ته‌چین · دوغ محلی', 570000), item(1, 'سالاد شیرازی', '', 45000)],
    note: 'لطفاً کباب‌ها را پخته‌تر بیاورید.',
    payment: 'online',
  },
  {
    id: 'o2',
    no: '1247',
    status: 'new',
    min: 2,
    name: 'رضا کریمی',
    area: 'شهرضا، بلوار ولیعصر',
    phone: '0912•••1102',
    items: [item(1, 'جوجه‌کباب با استخوان', 'چلو ساده', 265000)],
    payment: 'cash',
  },
  {
    id: 'o3',
    no: '1246',
    status: 'prep',
    min: 9,
    name: 'نگار حسینی',
    area: 'شهرضا، خیابان شهید رجایی',
    phone: '0935•••7721',
    items: [item(3, 'چلوکباب برگ', 'چلو ساده', 1185000)],
    payment: 'online',
    prep: 25,
  },
  {
    id: 'o4',
    no: '1245',
    status: 'ready',
    min: 24,
    name: 'علی موسوی',
    area: 'شهرضا، کوی امام رضا',
    phone: '0913•••9903',
    items: [item(1, 'قورمه‌سبزی', 'ته‌چین', 240000), item(1, 'دوغ محلی', '', 25000)],
    payment: 'cash',
    prep: 20,
    courier: { name: 'حسین جعفری', statusText: 'در راه رستوران · 3 دقیقه' },
  },
  {
    id: 'o5',
    no: '1244',
    status: 'way',
    min: 31,
    name: 'مریم صادقی',
    area: 'شهرضا، خیابان مطهری',
    phone: '0911•••3348',
    items: [item(2, 'چلوکباب کوبیده', 'چلو ساده', 570000)],
    payment: 'online',
    prep: 20,
    courier: { name: 'محمد نادری', statusText: 'در مسیر مشتری' },
  },
  {
    id: 'o6',
    no: '1243',
    status: 'done',
    min: 95,
    name: 'پریسا قاسمی',
    area: 'شهرضا، خیابان امام',
    phone: '0913•••5501',
    items: [item(1, 'جوجه‌کباب با استخوان', '', 265000)],
    payment: 'online',
    prep: 20,
  },
  {
    id: 'o7',
    no: '1242',
    status: 'rejected',
    min: 130,
    name: 'امیر یزدانی',
    area: 'شهرضا، شهرک صنعتی',
    phone: '0919•••2087',
    items: [item(1, 'قیمه‌ی نثار', '', 255000)],
    payment: 'online',
    reason: 'مواد اولیه تمام شده',
  },
];

/** Older history (spread over ~30 days) so infinite scroll and the date chips have something to show. */
const HISTORY_NAMES = ['حمید رحیمی', 'لیلا کاظمی', 'بهروز اکبری', 'سمیه نوروزی', 'کاوه شریفی', 'نرگس جلالی'];
const HISTORY: Seed[] = Array.from({ length: 18 }, (_, i) => ({
  id: `h${i + 1}`,
  no: String(1241 - i),
  status: i % 7 === 3 ? 'cancelled' : 'done',
  min: 60 * 26 + i * 60 * 40,
  name: HISTORY_NAMES[i % HISTORY_NAMES.length],
  area: 'شهرضا، خیابان امام',
  phone: `0913•••${String(1000 + i * 37).slice(-4)}`,
  items: [
    item(1 + (i % 3), i % 2 ? 'چلوکباب کوبیده' : 'جوجه‌کباب با استخوان', 'چلو ساده', (1 + (i % 3)) * 265000),
  ],
  payment: i % 3 ? 'online' : 'cash',
  prep: 20,
  reason: i % 7 === 3 ? 'رستوران شلوغ است' : undefined,
}));

export function seedOrders(now: number): Order[] {
  return [...SEEDS, ...HISTORY].map((s) => {
    const placed = now - s.min * MIN;
    const total = s.items.reduce((a, x) => a + x.price, 0);
    return {
      id: s.id,
      no: s.no,
      status: s.status,
      placedAt: iso(placed),
      customerName: s.name,
      customerPhoneMasked: s.phone,
      areaText: s.area,
      items: s.items,
      note: s.note ?? '',
      foodsTotal: total,
      payment: s.payment,
      prepMinutes: s.prep ?? 0,
      ...(s.status === 'new' ? { acceptDeadline: iso(now + ACCEPT_TIMEOUT_SEC * 1000 - s.min * MIN) } : {}),
      ...(s.reason ? { rejectReason: s.reason } : {}),
      courier: s.courier ? { ...s.courier, canCall: false } : null,
    };
  });
}

/** A new incoming order for the live demo (mock WebSocket `order.created`). */
export function demoOrder(now: number, seq: number): Order {
  return {
    id: `n${seq}`,
    no: String(1248 + seq),
    status: 'new',
    placedAt: iso(now),
    customerName: 'زهرا نوری',
    customerPhoneMasked: '0913•••6614',
    areaText: 'شهرضا، خیابان شریعتی',
    items: [item(2, 'چلوکباب کوبیده', 'ته‌چین', 570000), item(1, 'دوغ محلی', '', 25000)],
    note: 'بدون پیاز لطفاً',
    foodsTotal: 595000,
    payment: 'online',
    prepMinutes: 0,
    acceptDeadline: iso(now + ACCEPT_TIMEOUT_SEC * 1000),
    courier: null,
  };
}

const report = (
  period: string,
  revenue: number,
  orders: number,
  avgOrder: number,
  avgPrepMinutes: number,
  chart: [string, number][],
  topFoods: [string, number][],
  deltas: [string, string, string, string],
): Report => ({
  period,
  revenue,
  orders,
  avgOrder,
  avgPrepMinutes,
  deltas: { revenue: deltas[0], orders: deltas[1], avgOrder: deltas[2], avgPrepMinutes: deltas[3] },
  chart: chart.map(([label, value]) => ({ label, value })),
  topFoods: topFoods.map(([name, qty]) => ({ name, qty })),
});

export const reports: Record<'today' | 'week' | 'month', Report> = {
  today: report(
    'today',
    4850000,
    17,
    285000,
    22,
    [
      ['11', 2],
      ['12', 5],
      ['13', 9],
      ['14', 4],
      ['15', 2],
      ['16', 1],
      ['17', 2],
      ['18', 5],
      ['19', 8],
      ['20', 6],
    ],
    [
      ['چلوکباب کوبیده', 9],
      ['جوجه‌کباب با استخوان', 5],
      ['چلوکباب برگ', 3],
    ],
    ['12% بیشتر از دیروز', '2 سفارش بیشتر', 'مشابه دیروز', '3 دقیقه سریع‌تر'],
  ),
  week: report(
    'week',
    31200000,
    112,
    278000,
    24,
    [
      ['ش', 14],
      ['ی', 15],
      ['د', 12],
      ['س', 17],
      ['چ', 19],
      ['پ', 22],
      ['ج', 13],
    ],
    [
      ['چلوکباب کوبیده', 58],
      ['چلوکباب برگ', 29],
      ['جوجه‌کباب با استخوان', 27],
    ],
    ['8% بیشتر از هفته‌ی قبل', '9 سفارش بیشتر', '2% کمتر', 'مشابه هفته‌ی قبل'],
  ),
  month: report(
    'month',
    128400000,
    463,
    277000,
    23,
    [
      ['هفته 1', 98],
      ['هفته 2', 112],
      ['هفته 3', 121],
      ['هفته 4', 132],
    ],
    [
      ['چلوکباب کوبیده', 231],
      ['چلوکباب برگ', 120],
      ['قورمه‌سبزی', 98],
    ],
    ['5% بیشتر از ماه قبل', '24 سفارش بیشتر', 'مشابه ماه قبل', '1 دقیقه سریع‌تر'],
  ),
};

/** Server-computed settlement numbers (D-94/D-95): the panel never calculates them. */
function settlement(
  id: string,
  title: string,
  status: 'open' | 'pending' | 'paid',
  onlineSales: number,
  cashSales: number,
  paidDaysAgo: number | null,
  now: number,
): Settlement {
  const commissionPercent = 12;
  const commissionAmount = Math.round(((onlineSales + cashSales) * commissionPercent) / 100);
  return {
    id,
    title,
    status,
    onlineSales,
    cashSales,
    commissionPercent,
    commissionAmount,
    netPayable: onlineSales + cashSales - commissionAmount,
    shebaMasked: profile.shebaMasked,
    ...(paidDaysAgo === null ? {} : { paidAt: iso(now - paidDaysAgo * 24 * 60 * MIN) }),
  };
}

export const seedSettlements = (now: number): Settlement[] => [
  settlement('s1', 'هفته‌ی جاری', 'open', 3100000, 1250000, null, now),
  settlement('s2', 'هفته‌ی 4 آبان', 'paid', 31000000, 8000000, 9, now),
  settlement('s3', 'هفته‌ی 28 مهر', 'paid', 27500000, 6500000, 16, now),
];

export const seedNotifications = (now: number): Notification[] => [
  {
    id: 'n1',
    title: 'واریز هفتگی انجام شد',
    text: 'مبلغ 27,100,000 تومان به حساب شما واریز شد.',
    createdAt: iso(now - 24 * 60 * MIN),
    unread: true,
  },
  {
    id: 'n2',
    title: 'غذای جدید تأیید شد',
    text: 'قیمت و تصویر «چلوکباب برگ» در اپ مشتری نمایش داده می‌شود.',
    createdAt: iso(now - 2 * 24 * 60 * MIN),
    unread: true,
  },
  {
    id: 'n3',
    title: 'به‌روزرسانی قوانین',
    text: 'قوانین تسویه‌حساب رستوران‌ها به‌روز شد.',
    createdAt: iso(now - 7 * 24 * 60 * MIN),
    unread: false,
  },
];

/** Smallest valid one-page PDF for the invoice download. */
export const INVOICE_PDF =
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 226 400]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n';
