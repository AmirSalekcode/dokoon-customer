import { config } from '@/config/env';

/** Help content of the restaurant panel (screen specs §5). Content, not component code. */
export const PANEL_FAQ: { q: string; a: string }[] = [
  {
    q: 'چطور سفارش را قبول کنم؟',
    a: 'روی «پذیرش سفارش» بزنید، زمان آماده‌سازی را انتخاب و تأیید کنید. مشتری زمان تحویل را بر اساس همین زمان می‌بیند.',
  },
  {
    q: 'اگر ماده‌ی اولیه تمام شد چه کنم؟',
    a: 'غذا را در تب منو «ناموجود» کنید. اگر سفارشی آمده بود، آن را با دلیل رد کنید تا مبلغ به مشتری برگردد.',
  },
  {
    q: 'سفارش‌های نقدی چطور تسویه می‌شوند؟',
    a: 'پیک پول را از مشتری می‌گیرد و به دکون می‌دهد. دکون در تسویه‌ی هفتگی فروش آنلاین و نقدی را منهای کمیسیون به شبای شما واریز می‌کند.',
  },
  {
    q: 'چطور ساعت کاری را عوض کنم؟',
    a: 'از تب «حساب» وارد «ساعت کاری» شوید. برای بستن موقت هم می‌توانید کلید باز/بسته‌ی بالای صفحه را بزنید.',
  },
  {
    q: 'چرا عکس غذا نمایش داده نمی‌شود؟',
    a: 'هر عکس تازه اول باید تأیید دکون را بگیرد. تا آن موقع تصویر پیش‌فرض غذا به مشتری نشان داده می‌شود.',
  },
];

/** Subjects of a support message (contract enum). */
export const TICKET_CATEGORIES = [
  { key: 'order', label: 'سفارش' },
  { key: 'settle', label: 'تسویه' },
  { key: 'tech', label: 'مشکل فنی' },
  { key: 'other', label: 'سایر' },
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]['key'];
export const TICKET_MIN = 10;

/**
 * Restaurant support phone. The real number is not decided yet: demo builds show a sample, production
 * shows only «ارسال پیام» until the owner sets it (D-122).
 */
export const SUPPORT_PHONE: { href: string; text: string } | null = config.useMocks
  ? { href: 'tel:+983100000000', text: '۰۳۱ ۰۰۰۰ ۰۰۰۰' }
  : null;
