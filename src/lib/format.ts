const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const numberFmt = new Intl.NumberFormat('fa-IR');
const decimalFmt = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });

/** Convert any ASCII digits in a string to Persian digits. */
export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Normalize Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII. Use on every user input. */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/** Integer with Persian digits and thousands separators (e.g. ۱۲۵٬۰۰۰). */
export function formatNumber(n: number): string {
  return numberFmt.format(Math.round(n));
}

/** One-decimal number with Persian digits (e.g. 4.8 → ۴٫۸). */
export function formatDecimal(n: number): string {
  return decimalFmt.format(n);
}

/** Money is integer TOMAN. */
export function formatMoney(toman: number): string {
  return `${formatNumber(toman)} تومان`;
}

/** Iranian mobile: 11 digits starting 09 (after digit normalization, spaces/dashes removed). */
export function normalizePhone(input: string): string {
  return normalizeDigits(input).replace(/[\s-]/g, '');
}

export function isValidPhone(input: string): boolean {
  return /^09\d{9}$/.test(normalizePhone(input));
}

/** Display a phone as ۰۹۱۳ ۱۲۳ ۴۵۶۷. */
export function formatPhone(input: string): string {
  const p = normalizePhone(input);
  if (p.length !== 11) return toFaDigits(p);
  return toFaDigits(`${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}`);
}

/** «سلام (name) عزیز» — the greeting rule from CLAUDE.md. */
export function greeting(name: string): string {
  return `سلام ${name} عزیز`;
}

/** ETA set by the restaurant, display only: «۲۵–۳۵». */
export function formatEtaRange(etaMin: number, etaMax: number): string {
  return `${toFaDigits(etaMin)}–${toFaDigits(etaMax)}`;
}
