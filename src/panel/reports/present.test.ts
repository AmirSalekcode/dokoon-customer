import { describe, expect, it } from 'vitest';
import type { Report, Settlement } from '../api/types';
import { chartBars, settlementRow, settlementRows, statCards, topFoodRows } from './present';

// KAN-68: reports and settlements show the server's numbers only (D-94, D-95).
const report: Report = {
  period: 'today',
  revenue: 1000,
  orders: 3,
  // Deliberately NOT revenue / orders: the view must not recompute it.
  avgOrder: 999,
  avgPrepMinutes: 22,
  deltas: { revenue: '12% بیشتر از دیروز', orders: '2 سفارش بیشتر' },
  chart: [
    { label: '11', value: 2 },
    { label: '12', value: 5 },
  ],
  topFoods: [{ name: 'کوبیده', qty: 9 }],
};

// Deliberately inconsistent: net ≠ online + cash − commission, and commission ≠ 12% of anything.
const settlement: Settlement = {
  id: 's9',
  title: 'هفته‌ی 4 آبان',
  status: 'paid',
  onlineSales: 1000,
  cashSales: 500,
  commissionPercent: 12.5,
  commissionAmount: 7,
  netPayable: 42,
  shebaMasked: 'IR62 **** 4567',
  paidAt: '2026-11-12T10:00:00Z',
};

describe('no local calculation', () => {
  it('stat cards use the server values and comparison texts as-is', () => {
    const cards = statCards(report);
    expect(cards.map((c) => c.value)).toEqual(['۱٬۰۰۰ تومان', '۳', '۹۹۹ تومان', '۲۲ دقیقه']);
    expect(cards[0].sub).toBe('۱۲٪ بیشتر از دیروز');
    expect(cards[2].sub).toBeUndefined();
  });

  it('settlement rows show the server amounts and the stored rate', () => {
    const rows = settlementRows(settlement);
    expect(rows.find((r) => r.label === 'مبلغ قابل واریز')?.value).toBe('۴۲ تومان');
    expect(rows.find((r) => r.label.startsWith('کمیسیون دکون'))).toEqual({
      label: 'کمیسیون دکون (۱۲٫۵٪)',
      value: '− ۷ تومان',
    });
    expect(rows.find((r) => r.label === 'شبای مقصد')?.value).toBe('⁦IR۶۲ **** ۴۵۶۷⁩');
    expect(rows.find((r) => r.label === 'تاریخ واریز')?.value).toMatch(/آبان/);
    expect(settlementRow(settlement)).toMatchObject({ title: 'هفته‌ی ۴ آبان', meta: '۴۲ تومان', dot: false });
  });

  it('unpaid settlements have a dot and their status text', () => {
    expect(settlementRow({ ...settlement, status: 'open' })).toMatchObject({
      sub: 'دوره‌ی جاری · هنوز بسته نشده',
      dot: true,
    });
    expect(settlementRow({ ...settlement, status: 'pending' }).sub).toBe('در انتظار واریز');
  });

  it('chart and best sellers are mapped, the last bar highlighted', () => {
    expect(chartBars(report)).toEqual([
      { label: '۱۱', value: 2, valueText: '۲', on: false },
      { label: '۱۲', value: 5, valueText: '۵', on: true },
    ]);
    expect(topFoodRows(report)).toEqual([{ label: '۱. کوبیده', value: '۹ پرس' }]);
  });
});
