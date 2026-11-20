import { describe, expect, it } from 'vitest';
import {
  groupSheba,
  isValidAddress,
  isValidOtp,
  isValidPhone,
  isValidRestaurantName,
  isValidSheba,
  normalizePhone,
  normalizeSheba,
  phoneError,
  shebaError,
} from './validation';

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

describe('Sheba (IR + 24 digits, mod-97 checksum)', () => {
  it.each([
    ['IR062960000000100324200001', true],
    ['IR820540102680020817909002', true],
    ['ir82 0540 1026 8002 0817 9090 02', true],
    ['IR۸۲۰۵۴۰۱۰۲۶۸۰۰۲۰۸۱۷۹۰۹۰۰۲', true],
    ['820540102680020817909002', true],
    ['IR062960000000100324200002', false],
    ['IR06296000000010032420000', false],
    ['DE89370400440532013000', false],
    ['', false],
  ])('%s → %s', (input, ok) => expect(isValidSheba(input)).toBe(ok));

  it('normalizes and groups for display', () => {
    expect(normalizeSheba('820540102680020817909002')).toBe('IR820540102680020817909002');
    expect(groupSheba('IR820540102680020817909002')).toBe('IR82 0540 1026 8002 0817 9090 02');
  });

  it('error only once the number is complete', () => {
    expect(shebaError('IR8205')).toBeUndefined();
    expect(shebaError('IR062960000000100324200002')).toMatch(/درست نیست/);
    expect(shebaError('IR062960000000100324200001')).toBeUndefined();
  });

  it('name ≥ 2 and address ≥ 8 characters (trimmed)', () => {
    expect(isValidRestaurantName(' ک ')).toBe(false);
    expect(isValidRestaurantName('کب')).toBe(true);
    expect(isValidAddress('  شهرضا  ')).toBe(false);
    expect(isValidAddress('شهرضا، خیابان امام')).toBe(true);
  });
});
