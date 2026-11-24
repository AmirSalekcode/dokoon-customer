import { config } from '@/config/env';

/**
 * Courier help content (screen specs «پشتیبانی»). The contract has no support endpoint yet
 * (contract-notes 36 proposes `GET /c/support`), so the FAQ is app content and the phone numbers are
 * not invented: demo builds show samples, production shows only the FAQ until the numbers are set
 * (same rule as the panel, D-122).
 */
export const COURIER_FAQ: { q: string; a: string }[] = [
  {
    q: 'اگر مشتری جواب نداد چه کنم؟',
    a: 'دو بار تماس بگیرید، ۵ دقیقه صبر کنید و از صفحه‌ی سفارش «مشتری در دسترس نیست» را بزنید. مدیر شهر راهنمایی می‌کند.',
  },
  {
    q: 'نقدی که از مشتری گرفتم چه می‌شود؟',
    a: 'مبلغی که دریافت کرده‌اید در همان سفارش ثبت می‌شود و در تسویه‌ی هفتگی حساب می‌شود. قانون نهایی تسویه‌ی نقدی هنوز قطعی نشده و اعداد بخش درآمد نمونه‌اند.',
  },
  {
    q: 'چرا موقعیتم ثبت می‌شود؟',
    a: 'فقط وقتی آنلاین هستید یا سفارش دارید تا نزدیک‌ترین پیک پیشنهاد شود. با آفلاین شدن متوقف می‌شود.',
  },
  {
    q: 'مدرکم نزدیک انقضاست؛ چه کنم؟',
    a: 'از «حساب ← مدارک من» روی «بارگذاری مجدد» بزنید و عکس مدرک تازه را بفرستید. تا بررسی مدیر شهر وضعیت «در حال بررسی» است.',
  },
];

export interface SupportContact {
  title: string;
  sub: string;
  href: string;
  art: string;
}

export const SUPPORT_CONTACTS: SupportContact[] = config.useMocks
  ? [
      {
        title: 'تماس فوری با مدیر شهر',
        sub: 'مشکل در مسیر، مشتری یا رستوران',
        href: 'tel:+983100000000',
        art: 'dk-fries',
      },
      { title: 'پشتیبانی دکون', sub: '۰۲۱ ۰۰۰۰ ۰۰۰۰', href: 'tel:+982100000000', art: 'dk-cafe' },
    ]
  : [];
