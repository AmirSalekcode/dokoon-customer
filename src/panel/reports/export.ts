import { buildXlsx, XLSX_MIME, type XlsxCell } from '@/lib/xlsx';
import type { Settlement } from '../api/types';
import { SETTLE_STATUS } from './present';

/**
 * Settlement statements for the restaurant's accounting (KAN-75). Every number is copied from the server
 * (D-94/D-95: the panel never computes money); amounts are integer toman cells so Excel can sum them.
 * Dates are written as Persian (Jalali) text plus the ISO date, so both people and software can read them.
 */
const jalali = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dates(iso?: string): [string, string] {
  const t = Date.parse(iso ?? '');
  if (Number.isNaN(t)) return ['', ''];
  return [jalali.format(t), new Date(t).toISOString().slice(0, 10)];
}

const status = (s: Settlement) => SETTLE_STATUS[s.status ?? 'pending'];
const num = (n: number | undefined): XlsxCell => (typeof n === 'number' ? n : null);

/** One settlement: a two-column statement (شرح | مقدار). */
export function settlementStatementRows(s: Settlement): XlsxCell[][] {
  const [paidFa, paidIso] = dates(s.paidAt);
  const rows: XlsxCell[][] = [
    ['شرح', 'مقدار'],
    ['دوره', s.title ?? ''],
    ['شناسه‌ی تسویه', s.id ?? ''],
    ['وضعیت', status(s)],
    ['فروش آنلاین (تومان)', num(s.onlineSales)],
    ['فروش نقدی — پیک دریافت کرده (تومان)', num(s.cashSales)],
    ['درصد کمیسیون دکون', num(s.commissionPercent)],
    ['کمیسیون دکون (تومان)', num(s.commissionAmount)],
    ['مبلغ قابل واریز (تومان)', num(s.netPayable)],
    ['شبای مقصد', s.shebaMasked ?? ''],
  ];
  if (s.status === 'paid' && s.paidAt) rows.push(['تاریخ واریز', paidFa], ['تاریخ واریز (میلادی)', paidIso]);
  if (s.note) rows.push(['توضیح', s.note]);
  return rows;
}

export const SETTLEMENTS_HEADER = [
  'دوره',
  'شناسه',
  'وضعیت',
  'فروش آنلاین (تومان)',
  'فروش نقدی (تومان)',
  'درصد کمیسیون',
  'کمیسیون (تومان)',
  'قابل واریز (تومان)',
  'تاریخ واریز',
  'تاریخ واریز (میلادی)',
  'شبای مقصد',
];

/** All settlements: one row each, in the server's order. */
export function settlementsTableRows(list: Settlement[]): XlsxCell[][] {
  return [
    SETTLEMENTS_HEADER,
    ...list.map((s) => {
      const [paidFa, paidIso] = s.status === 'paid' ? dates(s.paidAt) : ['', ''];
      return [
        s.title ?? '',
        s.id ?? '',
        status(s),
        num(s.onlineSales),
        num(s.cashSales),
        num(s.commissionPercent),
        num(s.commissionAmount),
        num(s.netPayable),
        paidFa,
        paidIso,
        s.shebaMasked ?? '',
      ];
    }),
  ];
}

export function settlementXlsx(s: Settlement): Blob {
  const bytes = buildXlsx([{ name: 'صورت‌حساب تسویه', widths: [34, 30], rows: settlementStatementRows(s) }]);
  return new Blob([bytes as BlobPart], { type: XLSX_MIME });
}

export function settlementsXlsx(list: Settlement[]): Blob {
  const bytes = buildXlsx([
    {
      name: 'تسویه‌ها',
      widths: [22, 14, 22, 18, 18, 12, 16, 18, 14, 14, 26],
      rows: settlementsTableRows(list),
    },
  ]);
  return new Blob([bytes as BlobPart], { type: XLSX_MIME });
}

export { settlementFileName, settlementsFileName } from './names';
