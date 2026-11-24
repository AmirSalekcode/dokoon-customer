import { formatDecimal, formatMoney, toFaDigits } from '@/lib/format';
import type { HistoryRowView } from '../components/HistoryRow';
import type { HistoryItem, Settlement } from '../api/types';

/*
 * View mapping of trip history and settlements. Pure formatting of server values (dates in the Persian
 * calendar, Persian digits); no amount is derived.
 */

const TZ = 'Asia/Tehran';
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
const dayFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: TZ, day: 'numeric', month: 'long' });
const fullDayFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: TZ,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('fa-IR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });

const valid = (iso: string) => !Number.isNaN(Date.parse(iso));

/** «امروز» / «دیروز» / «۱۲ آبان» (Tehran days). */
export function dayText(iso: string, now = Date.now()): string {
  if (!valid(iso)) return '';
  const k = dayKey.format(Date.parse(iso));
  if (k === dayKey.format(now)) return 'امروز';
  if (k === dayKey.format(now - 86_400_000)) return 'دیروز';
  return dayFmt.format(Date.parse(iso));
}

export const timeText = (iso: string) => (valid(iso) ? timeFmt.format(Date.parse(iso)) : '');

/** «۱۲ آبان ۱۴۰۵» for dates (`2026-11-03`) and date-times. */
export function fullDate(iso: string): string {
  // A bare date is noon Tehran time so the day never shifts across the timezone.
  const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00+03:30` : iso);
  return Number.isNaN(t) ? '' : fullDayFmt.format(t);
}

/** «۱۰ آبان» for a bare date. */
function shortDate(iso: string): string {
  const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00+03:30` : iso);
  return Number.isNaN(t) ? '' : dayFmt.format(t);
}

const km = (n: number) => `${formatDecimal(n)} کیلومتر`;
const pay = (o: HistoryItem) => (o.cash ? 'نقدی' : 'آنلاین');

export function historyRow(o: HistoryItem, now = Date.now()): HistoryRowView {
  return {
    title: `${o.rest} ← ${o.toArea}`,
    sub: [dayText(o.deliveredAt, now), timeText(o.deliveredAt), km(o.km)].filter(Boolean).join(' · '),
    earn: formatMoney(o.earn),
    pay: pay(o),
  };
}

/** Detail rows of one past trip (from the list row: the contract has no detail endpoint, note 34). */
export function historyRows(o: HistoryItem, now = Date.now()) {
  const rows = [
    { label: 'شماره‌ی سفارش', value: toFaDigits(o.no) },
    { label: 'رستوران', value: o.rest },
    { label: 'مقصد', value: o.toArea },
    { label: 'زمان تحویل', value: `${dayText(o.deliveredAt, now)} · ${timeText(o.deliveredAt)}` },
    { label: 'مسافت', value: km(o.km) },
    { label: 'درآمد شما', value: formatMoney(o.earn) },
    { label: 'نحوه‌ی پرداخت', value: pay(o) },
  ];
  if (o.cash && o.cashCollected !== undefined)
    rows.push({ label: 'نقد دریافتی از مشتری', value: formatMoney(o.cashCollected) });
  return rows;
}

export function settlementRow(x: Settlement) {
  const paid = x.status === 'paid';
  // LTR isolate keeps «••••۴۲۱۰» in order inside RTL text.
  const sheba = `⁦${toFaDigits(x.shebaMasked)}⁩`;
  return {
    title: `${shortDate(x.periodStart)} تا ${fullDate(x.periodEnd)}`,
    sub: paid
      ? `واریز شد${x.paidAt ? ` · ${fullDate(x.paidAt)}` : ''} · شبا ${sheba}`
      : `در انتظار واریز · شبا ${sheba}`,
    meta: formatMoney(x.amount),
    dot: !paid,
  };
}

/** Detail rows of one payout, as sent. */
export function settlementRows(x: Settlement) {
  const rows = [
    { label: 'دوره', value: settlementRow(x).title },
    { label: 'وضعیت', value: x.status === 'paid' ? 'واریز شد' : 'در انتظار واریز' },
    { label: 'مبلغ', value: formatMoney(x.amount) },
    { label: 'شبای مقصد', value: `⁦${toFaDigits(x.shebaMasked)}⁩` },
  ];
  if (x.status === 'paid' && x.paidAt) rows.push({ label: 'تاریخ واریز', value: fullDate(x.paidAt) });
  return rows;
}
