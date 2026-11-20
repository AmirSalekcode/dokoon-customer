import type { ErrorKind } from '@/api/errors';

export type ErrorAction = 'retry' | 'home' | 'login' | 'support' | 'orders' | 'reload' | 'update';

export interface ErrorContent {
  code: string;
  title: string;
  text: string;
  d: string;
  cta: string;
  act: ErrorAction;
  sec?: string;
  secAct?: ErrorAction;
}

/** Texts from the prototype (App.dc.html D.errors); maintenance/update added for GET /app/config. */
export const ERROR_CONTENT: Record<ErrorKind, ErrorContent> = {
  offline: {
    code: '',
    title: 'اینترنت متصل نیست',
    text: 'اتصال وای‌فای یا اینترنت همراه خود را بررسی کنید و دوباره تلاش کنید.',
    d: 'M3 9a15 15 0 0 1 4-2.5M21 9a15 15 0 0 0-8-3.9M6.5 12.5a10 10 0 0 1 3-1.8M17.5 12.5a10 10 0 0 0-2-1.4M9.5 16a5 5 0 0 1 5 0M12 19.5h.01M4 4l16 16',
    cta: 'تلاش دوباره',
    act: 'retry',
  },
  e500: {
    code: '۵۰۰',
    title: 'مشکلی در سرور پیش آمده',
    text: 'این مشکل از طرف ماست و تیم فنی در حال بررسی است. چند دقیقه‌ی دیگر دوباره تلاش کنید.',
    d: 'M4 5h16v5H4zM4 14h16v5H4zM8 7.5h.01M8 16.5h.01M12 10v4',
    cta: 'تلاش دوباره',
    act: 'retry',
    sec: 'تماس با پشتیبانی',
    secAct: 'support',
  },
  e503: {
    code: '۵۰۳',
    title: 'سرویس موقتاً در دسترس نیست',
    text: 'در حال به‌روزرسانی هستیم و به‌زودی برمی‌گردیم. لطفاً کمی بعد سر بزنید.',
    d: 'M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z',
    cta: 'تلاش دوباره',
    act: 'retry',
  },
  e504: {
    code: '۵۰۴',
    title: 'پاسخ از سرور دیر رسید',
    text: 'ارتباط با سرور بیش از حد طول کشید. اگر در حال پرداخت بودید، پیش از پرداخت دوباره وضعیت سفارش‌ها را بررسی کنید.',
    d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    cta: 'تلاش دوباره',
    act: 'retry',
    sec: 'مشاهده‌ی سفارش‌ها',
    secAct: 'orders',
  },
  e403: {
    code: '۴۰۳',
    title: 'اجازه‌ی دسترسی ندارید',
    text: 'به این بخش دسترسی ندارید. اگر فکر می‌کنید اشتباهی رخ داده، با پشتیبانی تماس بگیرید.',
    d: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 15v2',
    cta: 'بازگشت به خانه',
    act: 'home',
    sec: 'تماس با پشتیبانی',
    secAct: 'support',
  },
  e404: {
    code: '۴۰۴',
    title: 'صفحه پیدا نشد',
    text: 'این صفحه حذف شده یا آدرس آن درست نیست.',
    d: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M9 9l4 4M13 9l-4 4',
    cta: 'بازگشت به خانه',
    act: 'home',
  },
  e401: {
    code: '۴۰۱',
    title: 'نشست شما منقضی شده',
    text: 'برای ادامه، دوباره با شماره‌ی موبایل وارد شوید.',
    d: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0',
    cta: 'ورود دوباره',
    act: 'login',
  },
  maintenance: {
    code: '',
    title: 'دکون در حال به‌روزرسانی است',
    text: 'برای بهتر شدن سرویس، مدت کوتاهی در دسترس نیستیم. کمی بعد دوباره سر بزنید.',
    d: 'M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z',
    cta: 'تلاش دوباره',
    act: 'reload',
  },
  update: {
    code: '',
    title: 'نسخه‌ی جدید دکون آماده است',
    text: 'این نسخه دیگر پشتیبانی نمی‌شود. برای ادامه، دکون را به‌روز کنید.',
    d: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    cta: 'به‌روزرسانی',
    act: 'update',
  },
};
