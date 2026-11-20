import { describe, expect, it } from 'vitest';
import { isValidOtp, isValidPhone, normalizePhone, phoneError } from './validation';

describe('phone: 09 + 9 digits, Persian/Arabic digits normalized', () => {
  it.each([
    ['09123456789', true],
    ['۰۹۱۲۳۴۵۶۷۸۹', true],
    ['٠٩١٢٣٤٥٦٧٨٩', true],
    ['0912 345 6789', true],
    ['0912-345-6789', true],
    ['9123456789', false],
    ['0812345678', false],
    ['091234567890', false],
    ['+989123456789', false],
    ['', false],
  ])('%s → %s', (input, ok) => expect(isValidPhone(input)).toBe(ok));

  it('normalizes to ASCII without separators', () => {
    expect(normalizePhone('۰۹۱۲ ۳۴۵-۶۷۸۹')).toBe('09123456789');
  });

  it('shows the error only once a full-length number is wrong', () => {
    expect(phoneError('0912')).toBeUndefined();
    expect(phoneError('09123456789')).toBeUndefined();
    expect(phoneError('08123456789')).toBe('شماره‌ی موبایل درست نیست');
  });
});

describe('OTP code', () => {
  it('needs exactly codeLength digits', () => {
    expect(isValidOtp('1234')).toBe(true);
    expect(isValidOtp('۱۲۳۴')).toBe(true);
    expect(isValidOtp('123')).toBe(false);
    expect(isValidOtp('12a4')).toBe(false);
    expect(isValidOtp('123456', 6)).toBe(true);
    expect(isValidOtp('1234', 6)).toBe(false);
  });
});
