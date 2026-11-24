import { formatDecimal, formatMoney, formatNumber, toFaDigits } from '@/lib/format';
import type { Bar } from '@/components/library/BarChart';
import type { Earnings, EarningsPeriod } from '../api/types';

/*
 * View mapping of the courier's earnings. Pure formatting: every amount, count and hour figure is shown
 * exactly as the server sent it (the cash settlement rule is undecided, D-94); nothing is added,
 * subtracted or derived here.
 */

export const PERIODS: readonly EarningsPeriod[] = ['today', 'week', 'month'];
export const PERIOD_LABEL: Record<EarningsPeriod, string> = {
  today: 'امروز',
  week: 'این هفته',
  month: 'این ماه',
};

export const D_WALLET = 'M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12M16 14h2';
const D_RECEIPT = 'M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z';
export const D_CLOCK = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2';
const D_BARS = 'M5 20V11M12 20V5M19 20v-7';

/** Shown under the balance until the cash settlement rule is decided (sample numbers). */
export const SAMPLE_NOTE =
  'نمونه: نقدی که از مشتری می‌گیرید از طلب شما کم می‌شود و هفتگی تسویه می‌شود. قانون نهایی تسویه‌ی نقدی هنوز قطعی نشده است.';

export interface StatView {
  key: string;
  label: string;
  value: string;
  sub: string;
  d: string;
}

export function statCards(e: Earnings): StatView[] {
  return [
    { key: 'total', label: `درآمد ${PERIOD_LABEL[e.period]}`, value: formatMoney(e.total), sub: 'درآمد شما', d: D_WALLET },
    { key: 'trips', label: 'سفارش‌ها', value: formatNumber(e.trips), sub: 'تحویل‌شده', d: D_RECEIPT },
    { key: 'hours', label: 'ساعت آنلاین', value: formatDecimal(e.hours), sub: 'ساعت', d: D_CLOCK },
    { key: 'avg', label: 'میانگین هر سفارش', value: formatMoney(e.avg), sub: 'درآمد', d: D_BARS },
  ];
}

export const balanceView = (e: Earnings) => ({
  balance: formatMoney(e.balance),
  cash: formatMoney(e.cashHeld),
  dokoon: e.dokoonOwes === undefined ? undefined : formatMoney(e.dokoonOwes),
  note: SAMPLE_NOTE,
});

export const CHART_TITLE: Record<EarningsPeriod, string> = {
  today: 'درآمد ساعتی امروز',
  week: 'درآمد روزانه‌ی این هفته',
  month: 'درآمد هفتگی این ماه',
};

/**
 * Bars as sent, in the server's order; the last one (current hour/day/week) is highlighted. The value
 * above a bar is the server amount in thousands («۱۵۰ هزار») so seven bars fit 358px; screen readers
 * get the same text. No bars when nothing was earned (the chart then shows its empty text).
 */
export function chartBars(e: Earnings): Bar[] {
  const list = e.chart ?? [];
  if (!list.some((b) => b.amount > 0)) return [];
  return list.map((b, i) => ({
    label: toFaDigits(b.label),
    value: b.amount,
    valueText: thousands(b.amount),
    on: i === list.length - 1,
  }));
}

/** 150000 → «۱۵۰ هزار», 2890000 → «۲٬۸۹۰ هزار», 152500 → «۱۵۲٫۵ هزار» (display unit only). */
export function thousands(toman: number): string {
  const k = toman / 1000;
  return `${Number.isInteger(k) ? formatNumber(k) : formatDecimal(k)} هزار`;
}
