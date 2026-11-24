/**
 * Jalali (Persian) calendar helpers on Tehran days (fixed UTC+03:30, no DST since 2022). Intl does the
 * calendar math, so there is no conversion table here. Used by the «تاریخ دلخواه» picker (KAN-109).
 */
const DAY = 86_400_000;
const TEHRAN_OFFSET = 3.5 * 3_600_000;
const TZ = 'Asia/Tehran';

const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
  timeZone: TZ,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});
const monthTitle = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: TZ,
  month: 'long',
  year: 'numeric',
});
const dayNum = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: TZ, day: 'numeric' });
const fullLabel = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' });
/** Persian week: Saturday first. */
const WEEK = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const WEEKDAY_HEADERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;

/** Tehran calendar day of an instant as `YYYY-MM-DD` (Gregorian). */
export const tehranIsoDay = (t: number): string => isoDay.format(t);

/** Last second of a Tehran day (`YYYY-MM-DD`) as an ISO instant. */
export function endOfTehranDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - TEHRAN_OFFSET + DAY - 1000).toISOString();
}

/** «آذر ۱۴۰۵» (ICU writes «۱۴۰۵ آذر»). */
function titleOf(t: number): string {
  const p = Object.fromEntries(monthTitle.formatToParts(t).map((x) => [x.type, x.value]));
  return `${p.month} ${p.year}`;
}

/** «سه‌شنبه ۳ آذر ۱۴۰۵», independent of the ICU pattern order. */
function labelOf(t: number): string {
  const p = Object.fromEntries(fullLabel.formatToParts(t).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
}

function jalali(t: number) {
  const p = Object.fromEntries(parts.formatToParts(t).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day) };
}

export interface CalendarCell {
  /** Gregorian Tehran day, `YYYY-MM-DD`. */
  iso: string;
  /** Jalali day number in Persian digits. */
  day: string;
  /** Spoken label, e.g. «سه‌شنبه ۳ آذر ۱۴۰۵». */
  label: string;
  enabled: boolean;
}
export interface CalendarMonth {
  key: string;
  title: string;
  /** Empty cells before day 1 (Saturday = 0). */
  lead: number;
  cells: CalendarCell[];
}

/**
 * Month grids from the Jalali month of `now` through `count` selectable days (today included).
 * Earlier days of the first month are shown disabled so the grid keeps its weekday columns.
 */
export function calendarMonths(now: number, count: number): CalendarMonth[] {
  const noon = Date.parse(`${tehranIsoDay(now)}T12:00:00Z`) - TEHRAN_OFFSET;
  const first = jalali(noon);
  const cell = (t: number, enabled: boolean): CalendarCell => ({
    iso: tehranIsoDay(t),
    day: dayNum.format(t),
    label: labelOf(t),
    enabled,
  });
  const months: CalendarMonth[] = [];
  const open = (t: number, j: { y: number; m: number; d: number }) => {
    const start = t - (j.d - 1) * DAY;
    const m: CalendarMonth = {
      key: `${j.y}-${j.m}`,
      title: titleOf(t),
      lead: WEEK.indexOf(weekday.format(start)),
      cells: [],
    };
    months.push(m);
    return m;
  };
  let month = open(noon, first);
  for (let d = 1; d < first.d; d++) month.cells.push(cell(noon - (first.d - d) * DAY, false));
  // The first month is shown whole, so its past days stay greyed out after the range too.
  for (let i = 0; i < count; i++) {
    const t = noon + i * DAY;
    const j = jalali(t);
    if (`${j.y}-${j.m}` !== month.key) month = open(t, j);
    month.cells.push(cell(t, true));
  }
  // Finish the first month when the range ends inside it (later days disabled).
  if (months.length === 1) {
    for (let t = noon + count * DAY; jalali(t).m === first.m; t += DAY) month.cells.push(cell(t, false));
  }
  return months;
}
