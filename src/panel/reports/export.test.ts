import { describe, expect, it, vi } from 'vitest';
import { saveFile, safeFileName } from '@/lib/saveFile';
import type { Settlement } from '../api/types';
import {
  SETTLEMENTS_HEADER,
  settlementFileName,
  settlementStatementRows,
  settlementsFileName,
  settlementsTableRows,
  settlementXlsx,
} from './export';

const paid: Settlement = {
  id: 's-12',
  title: 'هفته‌ی ۲ آذر',
  status: 'paid',
  onlineSales: 12_400_000,
  cashSales: 3_100_000,
  commissionPercent: 12,
  commissionAmount: 1_860_000,
  netPayable: 13_640_000,
  shebaMasked: 'IR62 **** 4567',
  paidAt: '2026-11-18T08:00:00Z',
};

// KAN-75: settlement statement exports for accounting.
describe('settlement statement (one settlement)', () => {
  it('copies the server numbers as numbers — nothing computed locally', () => {
    const rows = settlementStatementRows(paid);
    const value = (label: string) => rows.find((r) => r[0] === label)?.[1];
    expect(value('فروش آنلاین (تومان)')).toBe(12_400_000);
    expect(value('فروش نقدی — پیک دریافت کرده (تومان)')).toBe(3_100_000);
    expect(value('درصد کمیسیون دکون')).toBe(12);
    expect(value('کمیسیون دکون (تومان)')).toBe(1_860_000);
    expect(value('مبلغ قابل واریز (تومان)')).toBe(13_640_000);
    expect(value('شبای مقصد')).toBe('IR62 **** 4567');
    expect(value('تاریخ واریز (میلادی)')).toBe('2026-11-18');
    expect(String(value('تاریخ واریز'))).toMatch(/^۱۴۰۵\/۰۸\/۲۷$/);
    // Every numeric cell is one of the server's values (no totals or differences added).
    const server = new Set([12_400_000, 3_100_000, 12, 1_860_000, 13_640_000]);
    for (const r of rows) if (typeof r[1] === 'number') expect(server.has(r[1])).toBe(true);
  });

  it('a pending settlement has no payment date; a missing number stays empty', () => {
    const rows = settlementStatementRows({ id: 'x', status: 'pending', onlineSales: 5 });
    expect(rows.some((r) => String(r[0]).startsWith('تاریخ واریز'))).toBe(false);
    expect(rows.find((r) => r[0] === 'فروش نقدی — پیک دریافت کرده (تومان)')?.[1]).toBeNull();
  });
});

describe('all settlements table', () => {
  it('has one row per settlement under a fixed header', () => {
    const rows = settlementsTableRows([
      paid,
      { id: 's-13', title: 'هفته‌ی ۳', status: 'open', netPayable: 10 },
    ]);
    expect(rows[0]).toEqual(SETTLEMENTS_HEADER);
    expect(rows).toHaveLength(3);
    expect(rows[1].slice(0, 8)).toEqual([
      'هفته‌ی ۲ آذر',
      's-12',
      'واریز شد',
      12_400_000,
      3_100_000,
      12,
      1_860_000,
      13_640_000,
    ]);
    expect(rows[2][8]).toBe('');
  });
});

describe('files', () => {
  it('builds a real xlsx blob', async () => {
    const b = settlementXlsx(paid);
    expect(b.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const head = new Uint8Array(await b.arrayBuffer()).subarray(0, 4);
    expect([...head]).toEqual([0x50, 0x4b, 0x03, 0x04]); // "PK\3\4"
  });

  it('names are ASCII', () => {
    expect(settlementFileName('s-12', 'pdf')).toBe('dokoon-settlement-s-12.pdf');
    expect(settlementsFileName(new Date('2026-11-21T10:00:00Z'))).toBe('dokoon-settlements-2026-11-21.xlsx');
    expect(safeFileName('صورت حساب/1.xlsx')).toBe('-1.xlsx');
  });

  it('downloads in the browser and shares in the Android app', async () => {
    const blob = new Blob(['hi'], { type: 'text/plain' });
    const download = vi.fn();
    const share = vi.fn(async () => ({ shared: true }));
    expect(await saveFile(blob, 'a.txt', 't', { native: () => false, share, download })).toBe('downloaded');
    expect(download).toHaveBeenCalledWith(blob, 'a.txt');
    expect(await saveFile(blob, 'a.txt', 't', { native: () => true, share, download })).toBe('shared');
    expect(share).toHaveBeenCalledWith({ name: 'a.txt', base64: 'aGk=', mime: 'text/plain', title: 't' });
  });
});
