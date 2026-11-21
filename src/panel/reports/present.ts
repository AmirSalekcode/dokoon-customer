import { formatDecimal, formatMoney, formatNumber, toFaDigits } from '@/lib/format';
import type { Report, Settlement } from '../api/types';

/*
 * View mapping of reports and settlements. Pure formatting: amounts, counts, percentages and comparison
 * texts are shown exactly as the server sent them (D-94, D-95); nothing is calculated here.
 */

const D_WALLET = 'M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12M16 14h2';
const D_RECEIPT = 'M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1zM9 8h6M9 12h6';
const D_BARS = 'M5 20V11M12 20V5M19 20v-7';
const D_CLOCK = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2';
export const D_SETTLE = D_WALLET;

export interface StatView {
  key: string;
  label: string;
  value: string;
  sub?: string;
  d: string;
}

/** Comparison with the previous period: the server's text, with Persian digits. */
const delta = (r: Report, k: string) =>
  r.deltas?.[k] ? toFaDigits(r.deltas[k]).replace(/%/g, '٪') : undefined;

export function statCards(r: Report): StatView[] {
  return [
    {
      key: 'revenue',
      label: 'درآمد',
      value: formatMoney(r.revenue ?? 0),
      sub: delta(r, 'revenue'),
      d: D_WALLET,
    },
    {
      key: 'orders',
      label: 'تعداد سفارش',
      value: formatNumber(r.orders ?? 0),
      sub: delta(r, 'orders'),
      d: D_RECEIPT,
    },
    {
      key: 'avgOrder',
      label: 'میانگین هر سفارش',
      value: formatMoney(r.avgOrder ?? 0),
      sub: delta(r, 'avgOrder'),
      d: D_BARS,
    },
    {
      key: 'avgPrepMinutes',
      label: 'زمان آماده‌سازی',
      value: `${formatNumber(r.avgPrepMinutes ?? 0)} دقیقه`,
      sub: delta(r, 'avgPrepMinutes'),
      d: D_CLOCK,
    },
  ];
}

export const CHART_TITLE: Record<string, string> = {
  today: 'سفارش‌ها در ساعت‌های امروز',
  week: 'سفارش‌ها در روزهای این هفته',
  month: 'سفارش‌ها در هفته‌های این ماه',
};

/** Bars as sent; the last one (current hour/day/week) is highlighted. */
export function chartBars(r: Report) {
  const list = r.chart ?? [];
  return list.map((b, i) => ({
    label: toFaDigits(b.label ?? ''),
    value: b.value ?? 0,
    valueText: formatNumber(b.value ?? 0),
    on: i === list.length - 1,
  }));
}

export const topFoodRows = (r: Report) =>
  (r.topFoods ?? []).map((f, i) => ({
    label: `${toFaDigits(i + 1)}. ${f.name ?? ''}`,
    value: `${formatNumber(f.qty ?? 0)} پرس`,
  }));

const dateFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' });
const dateText = (iso?: string) => {
  const t = Date.parse(iso ?? '');
  return Number.isNaN(t) ? '' : dateFmt.format(t);
};

export const SETTLE_STATUS: Record<NonNullable<Settlement['status']>, string> = {
  open: 'دوره‌ی جاری · هنوز بسته نشده',
  pending: 'در انتظار واریز',
  paid: 'واریز شد',
};

export function settlementRow(s: Settlement) {
  const paid = s.status === 'paid';
  return {
    title: toFaDigits(s.title ?? ''),
    sub: paid && s.paidAt ? `واریز شد · ${dateText(s.paidAt)}` : SETTLE_STATUS[s.status ?? 'pending'],
    meta: formatMoney(s.netPayable ?? 0),
    dot: !paid,
  };
}

/** Detail rows; the commission rate is the one stored in this settlement (read-only, D-95). */
export function settlementRows(s: Settlement) {
  const rows = [
    { label: 'فروش آنلاین', value: formatMoney(s.onlineSales ?? 0) },
    { label: 'فروش نقدی (پیک دریافت کرده)', value: formatMoney(s.cashSales ?? 0) },
    {
      label: `کمیسیون دکون (${formatDecimal(s.commissionPercent ?? 0)}٪)`,
      value: `− ${formatMoney(s.commissionAmount ?? 0)}`,
    },
    { label: 'مبلغ قابل واریز', value: formatMoney(s.netPayable ?? 0) },
    // LTR isolate: «IR62 **** … 4567» keeps its order inside the RTL list.
    { label: 'شبای مقصد', value: `⁦${toFaDigits(s.shebaMasked ?? '')}⁩` },
  ];
  if (s.status === 'paid' && s.paidAt) rows.push({ label: 'تاریخ واریز', value: dateText(s.paidAt) });
  return rows;
}
