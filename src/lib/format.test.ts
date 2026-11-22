import {
  formatDecimal,
  formatEtaRange,
  formatMmss,
  formatMoney,
  formatNumber,
  formatPhone,
  greeting,
  isValidPhone,
  normalizeDigits,
  toFaDigits,
} from './format';

describe('format', () => {
  it('converts to Persian digits', () => {
    expect(toFaDigits('0912')).toBe('۰۹۱۲');
    expect(toFaDigits(45)).toBe('۴۵');
  });

  it('formats a countdown as mm:ss with Persian digits', () => {
    expect(formatMmss(75)).toBe('۰۱:۱۵');
    expect(formatMmss(5)).toBe('۰۰:۰۵');
    expect(formatMmss(0)).toBe('۰۰:۰۰');
  });

  it('normalizes Persian and Arabic digits to ASCII', () => {
    expect(normalizeDigits('۰۹۱۳')).toBe('0913');
    expect(normalizeDigits('٠٩١٣')).toBe('0913');
    expect(normalizeDigits('a۱b2')).toBe('a1b2');
  });

  it('formats numbers and money with fa-IR', () => {
    expect(formatNumber(125000)).toBe('۱۲۵٬۰۰۰');
    expect(formatMoney(45000)).toBe('۴۵٬۰۰۰ تومان');
    expect(formatDecimal(4.8)).toBe('۴٫۸');
  });

  it('validates Iranian mobile numbers after normalization', () => {
    expect(isValidPhone('09131234567')).toBe(true);
    expect(isValidPhone('۰۹۱۳۱۲۳۴۵۶۷')).toBe(true);
    expect(isValidPhone('0913 123 4567')).toBe(true);
    expect(isValidPhone('9131234567')).toBe(false);
    expect(isValidPhone('0813123456')).toBe(false);
  });

  it('formats phone and greeting and eta', () => {
    expect(formatPhone('09131234567')).toBe('۰۹۱۳ ۱۲۳ ۴۵۶۷');
    expect(greeting('امیر')).toBe('سلام امیر عزیز');
    expect(formatEtaRange(25, 35)).toBe('۲۵–۳۵');
  });
});
