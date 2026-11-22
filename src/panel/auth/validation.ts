/**
 * Input rules of the restaurant login/registration (restaurant screen specs §1). The generic ones (phone,
 * SMS code, Sheba) live in `src/lib/validation` and are shared with the courier app; the server validates
 * everything again (security checklist §1).
 */
export {
  groupSheba,
  isValidOtp,
  isValidPhone,
  isValidSheba,
  normalizePhone,
  normalizeSheba,
  phoneError,
  shebaError,
} from '@/lib/validation';

export const isValidRestaurantName = (v: string) => v.trim().length >= 2;
export const isValidAddress = (v: string) => v.trim().length >= 8;
