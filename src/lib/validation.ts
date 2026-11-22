import { isValidPhone, normalizeDigits, normalizePhone } from './format';

/**
 * Input rules shared by the restaurant and courier sign-in/registration (plain functions on the shared
 * `format` rules, D-111). They only help the user: the server validates everything again (security
 * checklists §1).
 */
export { isValidPhone, normalizePhone };

/** Inline error once the user has typed a full-length number that is still wrong. */
export function phoneError(input: string): string | undefined {
  const v = normalizePhone(input);
  return v.length >= 11 && !isValidPhone(v) ? 'شماره‌ی موبایل درست نیست' : undefined;
}

/** SMS code: exactly `length` digits (default 4). */
export function isValidOtp(input: string, length = 4): boolean {
  const v = normalizeDigits(input);
  return v.length === length && /^\d+$/.test(v);
}

/**
 * Sheba (Iranian IBAN): «IR» + 24 digits. Accepts Persian digits, spaces/dashes, lower case and a
 * missing «IR» (typing only the 24 digits).
 */
export function normalizeSheba(input: string): string {
  const v = normalizeDigits(input).replace(/[\s-]/g, '').toUpperCase();
  return /^\d{24}$/.test(v) ? `IR${v}` : v;
}

/** ISO 13616 mod-97 checksum (the server checks again, and that the account is the owner's). */
export function isValidSheba(input: string): boolean {
  const v = normalizeSheba(input);
  if (!/^IR\d{24}$/.test(v)) return false;
  const moved = v.slice(4) + v.slice(0, 4);
  const digits = moved.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of digits) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}

export function shebaError(input: string): string | undefined {
  const v = normalizeSheba(input);
  if (v.length < 26) return undefined;
  if (!/^IR\d{24}$/.test(v)) return 'شبا باید IR و ۲۴ رقم باشد';
  return isValidSheba(v) ? undefined : 'شماره‌ی شبا درست نیست؛ دوباره بررسی کنید';
}

/** Display: «IR06 2960 0000 …» groups of four (left-to-right field). */
export const groupSheba = (input: string) => normalizeSheba(input).replace(/(.{4})(?=.)/g, '$1 ');

/** Iranian national code: 10 digits (Persian/Arabic digits, spaces and dashes allowed while typing). */
export const normalizeNationalId = (input: string) => normalizeDigits(input).replace(/[\s-]/g, '');

/** National code check digit (mod 11); ten equal digits are never valid. The server checks again. */
export function isValidNationalId(input: string): boolean {
  const v = normalizeNationalId(input);
  if (!/^\d{10}$/.test(v) || /^(\d)\1{9}$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(v[i]) * (10 - i);
  const r = sum % 11;
  const check = Number(v[9]);
  return r < 2 ? check === r : check === 11 - r;
}

export function nationalIdError(input: string): string | undefined {
  const v = normalizeNationalId(input);
  if (v.length < 10) return undefined;
  return isValidNationalId(v) ? undefined : 'کد ملی درست نیست';
}
