import type {
  ActiveOrder,
  CourierDoc,
  CourierStatus,
  DocType,
  Earnings,
  EarningsPeriod,
  HistoryItem,
  Me,
  Offer,
  Settlement,
} from '../api/types';

/**
 * Seed data of the courier mock (sample names and numbers from prototype-courier/App.dc.html). Mock/demo
 * builds and tests only. Money is integer toman; settlement numbers are samples (cash rule undecided).
 */
export const OTP_CODE = '1234';
export const RESEND_SEC = 120;

/** Demo phones for every approval state (any other phone is an approved courier). */
export const DEMO_STATUS_PHONES: Record<string, CourierStatus> = {
  '09120000001': 'new',
  '09120000002': 'pending',
  '09120000003': 'suspended',
};

/** A national code that already belongs to another courier: registration answers 422 on it (demo/E2E). */
export const TAKEN_NATIONAL_ID = '1234567891';

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

export const seedDocs = (): CourierDoc[] => [
  { type: 'nid', status: 'ok' },
  { type: 'lic', status: 'ok', expiresAt: daysFromNow(600) },
  { type: 'card', status: 'ok' },
  // Expires soon → the documents row shows a warning dot and «تمدید».
  { type: 'ins', status: 'bad', expiresAt: daysFromNow(9) },
];

export const me = (phone: string, status: CourierStatus, docs: CourierDoc[]): Me => ({
  name: status === 'new' ? '' : 'مهدی کریمی',
  phone,
  // 'new' is the proposed extra status of contract-notes 31.
  status: status as Me['status'],
  docs: status === 'new' ? [] : docs,
});

export const docTypes: DocType[] = [
  { id: 'nid', label: 'کارت ملی', sub: 'عکس روی کارت', required: true },
  { id: 'lic', label: 'گواهینامه موتور', sub: 'عکس روی گواهینامه', required: true },
  { id: 'card', label: 'کارت موتورسیکلت', sub: 'عکس کارت موتور', required: true },
  { id: 'ins', label: 'بیمه‌نامه شخص ثالث', sub: 'صفحه‌ی اول بیمه‌نامه', required: true },
  { id: 'photo', label: 'عکس چهره', sub: 'برای کارت پیک', required: false },
];

/** Offer + the full order it becomes once accepted (address/phone only after accepting, courier rule 2). */
export interface OfferSeed {
  offer: Omit<Offer, 'expiresAt'>;
  order: Omit<ActiveOrder, 'id' | 'stage'>;
}

export const offerSeeds: OfferSeed[] = [
  {
    offer: {
      id: 'of1',
      rest: 'کبابی سنتی زاگرس',
      fromArea: 'شهرضا، خیابان امام',
      toArea: 'شهرضا، خیابان شریعتی',
      km: 2.4,
      kmToRest: 0.8,
      minutes: 12,
      earn: 68000,
      cash: true,
    },
    order: {
      no: 4821,
      rest: 'کبابی سنتی زاگرس',
      restAddress: 'شهرضا، خیابان امام، نبش کوچه ۱۲',
      restPhone: '03153231234',
      cust: 'زهرا نوری',
      custAddress: 'خیابان شریعتی، کوچه ۷، پلاک ۱۴',
      custPhone: '09131112233',
      note: 'طبقه ۲، واحد ۴؛ زنگ را دوبار بزنید',
      cash: true,
      due: 412000,
      earn: 68000,
      items: [
        { id: 'i1', q: 2, name: 'چلوکباب کوبیده', opt: 'دوغ' },
        { id: 'i2', q: 1, name: 'جوجه‌کباب', opt: '' },
        { id: 'i3', q: 1, name: 'سالاد شیرازی', opt: '' },
      ],
    },
  },
  {
    offer: {
      id: 'of2',
      rest: 'پیتزا ماهان',
      fromArea: 'شهرضا، بلوار مدرس',
      toArea: 'شهرضا، خیابان ارم',
      km: 1.8,
      kmToRest: 1.2,
      minutes: 9,
      earn: 52000,
      cash: false,
    },
    order: {
      no: 4822,
      rest: 'پیتزا ماهان',
      restAddress: 'شهرضا، بلوار مدرس، روبه‌روی بانک ملی',
      restPhone: '03153235678',
      cust: 'علی رضایی',
      custAddress: 'خیابان ارم، کوچه گلها، پلاک ۳',
      custPhone: '09132223344',
      note: 'درب سفید، زنگ سمت راست',
      cash: false,
      due: 0,
      earn: 52000,
      items: [
        { id: 'i1', q: 1, name: 'پیتزا مخصوص', opt: 'بزرگ' },
        { id: 'i2', q: 2, name: 'نوشابه', opt: '' },
      ],
    },
  },
  {
    offer: {
      id: 'of3',
      rest: 'کافه پاتوق',
      fromArea: 'شهرضا، خیابان انقلاب',
      toArea: 'شهرضا، کوی معلم',
      km: 3.1,
      kmToRest: 0.5,
      minutes: 14,
      earn: 41000,
      cash: false,
    },
    order: {
      no: 4823,
      rest: 'کافه پاتوق',
      restAddress: 'شهرضا، خیابان انقلاب، پاساژ آفتاب',
      restPhone: '03153239012',
      cust: 'مریم احمدی',
      custAddress: 'کوی معلم، خیابان دوم، پلاک ۲۱',
      custPhone: '09133334455',
      note: '',
      cash: false,
      due: 0,
      earn: 41000,
      items: [
        { id: 'i1', q: 2, name: 'لاته', opt: '' },
        { id: 'i2', q: 1, name: 'کیک شکلاتی', opt: '' },
      ],
    },
  },
];

/** Offers the demo stream adds while the courier is online (ids and numbers are assigned on arrival). */
export const extraSeeds: OfferSeed[] = [
  {
    offer: {
      id: 'x',
      rest: 'ساندویچ نارنج',
      fromArea: 'شهرضا، خیابان مطهری',
      toArea: 'شهرضا، خیابان وحدت',
      km: 2.0,
      kmToRest: 0.6,
      minutes: 10,
      earn: 47000,
      cash: true,
    },
    order: {
      no: 0,
      rest: 'ساندویچ نارنج',
      restAddress: 'شهرضا، خیابان مطهری، پلاک ۴۰',
      restPhone: '03153234567',
      cust: 'سارا کاظمی',
      custAddress: 'خیابان وحدت، کوچه ۳، پلاک ۸',
      custPhone: '09134445566',
      note: '',
      cash: true,
      due: 186000,
      earn: 47000,
      items: [{ id: 'i1', q: 2, name: 'ساندویچ هات‌داگ', opt: '' }],
    },
  },
  {
    offer: {
      id: 'x',
      rest: 'سفره‌خانه باغ',
      fromArea: 'شهرضا، میدان امام',
      toArea: 'شهرضا، خیابان کاشانی',
      km: 3.4,
      kmToRest: 1.1,
      minutes: 15,
      earn: 59000,
      cash: false,
    },
    order: {
      no: 0,
      rest: 'سفره‌خانه باغ',
      restAddress: 'شهرضا، میدان امام، ضلع شمالی',
      restPhone: '03153238901',
      cust: 'رضا محمدی',
      custAddress: 'خیابان کاشانی، کوچه ۱۱، پلاک ۲',
      custPhone: '09135556677',
      note: 'جلوی در منتظرم',
      cash: false,
      due: 0,
      earn: 59000,
      items: [
        { id: 'i1', q: 1, name: 'دیزی سنگی', opt: '' },
        { id: 'i2', q: 1, name: 'دوغ محلی', opt: '' },
      ],
    },
  },
];

/** Offers stay open 30 s (screen-specs: offer alert timer). */
export const OFFER_TTL_MS = 30_000;

export function seedHistory(now = Date.now()): HistoryItem[] {
  const rests = ['کبابی سنتی زاگرس', 'پیتزا ماهان', 'کافه پاتوق', 'ساندویچ نارنج', 'سفره‌خانه باغ'];
  const areas = ['خیابان شریعتی', 'خیابان ارم', 'کوی معلم', 'خیابان وحدت', 'خیابان کاشانی'];
  // 45 trips over the last ~3 weeks → pages of 20, 20 and 5.
  return Array.from({ length: 45 }, (_, i) => {
    const cash = i % 3 === 0;
    return {
      id: `h${i + 1}`,
      no: 4820 - i,
      rest: rests[i % rests.length],
      toArea: `شهرضا، ${areas[(i * 2) % areas.length]}`,
      deliveredAt: new Date(now - (i * 11 + 1) * 3_600_000).toISOString(),
      km: Math.round((1.2 + ((i * 37) % 30) / 10) * 10) / 10,
      earn: 40000 + ((i * 7919) % 30) * 1000,
      cash,
      ...(cash ? { cashCollected: 180000 + (i % 5) * 45000 } : {}),
    };
  });
}

export const HISTORY_PAGE = 20;

const bars = (labels: string[], amounts: number[]) =>
  labels.map((label, i) => ({ label, amount: amounts[i] }));

export const earnings: Record<EarningsPeriod, Earnings> = {
  today: {
    period: 'today',
    total: 480000,
    trips: 6,
    hours: 5.5,
    avg: 80000,
    balance: 1_320_000,
    cashHeld: 598000,
    dokoonOwes: 1_918_000,
    chart: bars(['۱۰', '۱۲', '۱۴', '۱۶', '۱۸'], [40000, 120000, 150000, 60000, 110000]),
  },
  week: {
    period: 'week',
    total: 2_860_000,
    trips: 38,
    hours: 34,
    avg: 75000,
    balance: 1_320_000,
    cashHeld: 598000,
    dokoonOwes: 1_918_000,
    chart: bars(
      ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'],
      [420000, 380000, 510000, 300000, 450000, 480000, 320000],
    ),
  },
  month: {
    period: 'month',
    total: 11_400_000,
    trips: 152,
    hours: 140,
    avg: 75000,
    balance: 1_320_000,
    cashHeld: 598000,
    dokoonOwes: 1_918_000,
    chart: bars(['هفته ۱', 'هفته ۲', 'هفته ۳', 'هفته ۴'], [2_600_000, 2_890_000, 3_050_000, 2_860_000]),
  },
};

export function seedSettlements(now = Date.now()): Settlement[] {
  const day = 86_400_000;
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  return [
    {
      id: 's3',
      periodStart: iso(now - 7 * day),
      periodEnd: iso(now - day),
      amount: 1_320_000,
      status: 'pending',
      shebaMasked: '••••4210',
    },
    {
      id: 's2',
      periodStart: iso(now - 14 * day),
      periodEnd: iso(now - 8 * day),
      amount: 2_140_000,
      status: 'paid',
      paidAt: new Date(now - 6 * day).toISOString(),
      shebaMasked: '••••4210',
    },
    {
      id: 's1',
      periodStart: iso(now - 21 * day),
      periodEnd: iso(now - 15 * day),
      amount: 1_890_000,
      status: 'paid',
      paidAt: new Date(now - 13 * day).toISOString(),
      shebaMasked: '••••4210',
    },
  ];
}
