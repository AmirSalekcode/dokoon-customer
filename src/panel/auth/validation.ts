import { isValidPhone, normalizeDigits, normalizePhone } from '@/lib/format';

/**
 * Input rules of the restaurant login/registration (restaurant screen specs §1). Plain functions instead
 * of a schema library, on the shared `src/lib/format` rules (D-111); the server validates everything
 * again (security checklist §1).
 */
export { isValidPhone, normalizePhone };

/** Inline error once the user has typed a full-length number that is still wrong. */
export function phoneError(input: string): string | undefined {
  const v = normalizePhone(input);
  return v.length >= 11 && !isValidPhone(v) ? 'شماره‌ی موبایل درست نیست' : undefined;
}

/** SMS code: exactly `length` digits (server sends `codeLength`, default 4). */
export function isValidOtp(input: string, length = 4): boolean {
  const v = normalizeDigits(input);
  return v.length === length && /^\d+$/.test(v);
}
