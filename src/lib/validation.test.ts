import { describe, expect, it } from 'vitest';
import { isValidNationalId, nationalIdError, normalizeNationalId } from './validation';

// KAN-91: national code check digit (shared; the server checks again).
describe('national code', () => {
  it.each([
    ['0012345679', true],
    ['۰۰۱۲۳۴۵۶۷۹', true],
    ['001-234567-9', true],
    ['1234567891', true],
    ['0012345678', false],
    ['1111111111', false],
    ['001234567', false],
    ['00123456790', false],
  ])('%s → %s', (v, ok) => {
    expect(isValidNationalId(v)).toBe(ok);
  });

  it('shows an error only once ten digits are typed', () => {
    expect(nationalIdError('00123')).toBeUndefined();
    expect(nationalIdError('0012345678')).toBe('کد ملی درست نیست');
    expect(normalizeNationalId('۰۰۱ ۲۳۴')).toBe('001234');
  });
});
