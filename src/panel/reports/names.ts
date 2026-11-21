/** Statement file names (KAN-75), ASCII so share sheets and file managers keep them intact. */
export const settlementFileName = (id: string, ext: 'pdf' | 'xlsx') => `dokoon-settlement-${id}.${ext}`;
export const settlementsFileName = (now = new Date()) =>
  `dokoon-settlements-${now.toISOString().slice(0, 10)}.xlsx`;

/** Toasts after a statement export: browser download vs Android share sheet. */
export const SAVED_TEXT = {
  downloaded: 'صورت‌حساب دانلود شد',
  shared: 'صورت‌حساب آماده است؛ ذخیره یا ارسال کنید',
};
export const PDF_FAILED = 'صورت‌حساب PDF دریافت نشد؛ دوباره تلاش کنید';
export const XLSX_FAILED = 'فایل اکسل ساخته نشد؛ دوباره تلاش کنید';
