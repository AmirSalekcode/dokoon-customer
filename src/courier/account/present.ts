import { toFaDigits } from '@/lib/format';
import type { MeProfile } from '../api/types';

/*
 * View mapping of the courier profile. Masked values are shown exactly as the server masked them
 * (national code, Sheba); only digits become Persian and Latin runs are kept left-to-right.
 */

/** LTR isolate so «IR** …۴۲ ۱۰» keeps its order inside RTL text. */
export const ltr = (s: string) => `⁦${s}⁩`;

/** Own mobile, partly hidden on screen (shoulder-surfing): 09131234567 → «۰۹۱۳•••۴۵۶۷». */
export function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.length === 11 ? toFaDigits(`${d.slice(0, 4)}•••${d.slice(7)}`) : toFaDigits(phone);
}

/** Card line under the name: «۰۹۱۳•••۴۵۶۷ · شهرضا». */
export const cardSub = (me: MeProfile) =>
  [me.phone ? ltr(maskPhone(me.phone)) : '', me.city ?? ''].filter(Boolean).join(' · ');

/** «اطلاعات من» rows; fields the server did not send are left out. */
export function infoRows(me: MeProfile) {
  const rows: { label: string; value: string }[] = [];
  if (me.name) rows.push({ label: 'نام', value: me.name });
  if (me.phone) rows.push({ label: 'موبایل', value: ltr(maskPhone(me.phone)) });
  if (me.nationalIdMasked) rows.push({ label: 'کد ملی', value: ltr(toFaDigits(me.nationalIdMasked)) });
  if (me.plate) rows.push({ label: 'پلاک موتور', value: ltr(toFaDigits(me.plate)) });
  if (me.shebaMasked) rows.push({ label: 'شماره‌ی شبا', value: ltr(toFaDigits(me.shebaMasked)) });
  return rows;
}
