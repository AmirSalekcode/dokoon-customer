import { describe, expect, it } from 'vitest';
import { calendarMonths, endOfTehranDay, tehranIsoDay } from './jalali';

// KAN-109: Jalali month grid for «تاریخ دلخواه» (Tehran days, weeks start on Saturday).
const NOW = Date.parse('2026-11-24T09:00:00+03:30'); // Tuesday, 3 Azar 1405

describe('Tehran days', () => {
  it('uses the Tehran calendar day, not UTC', () => {
    expect(tehranIsoDay(NOW)).toBe('2026-11-24');
    expect(tehranIsoDay(Date.parse('2026-11-24T22:00:00Z'))).toBe('2026-11-25'); // 01:30 Tehran
  });

  it('ends a day at 23:59:59 Tehran', () => {
    expect(endOfTehranDay('2026-11-24')).toBe('2026-11-24T20:29:59.000Z');
    expect(endOfTehranDay('2027-03-20')).toBe('2027-03-20T20:29:59.000Z');
  });
});

describe('calendarMonths', () => {
  const months = calendarMonths(NOW, 40);

  it('covers today and the next days, grouped by Jalali month', () => {
    expect(months.map((m) => m.title)).toEqual(['آذر ۱۴۰۵', 'دی ۱۴۰۵']);
    const days = months.flatMap((m) => m.cells.filter((c) => c.enabled));
    expect(days).toHaveLength(40);
    expect(days[0]).toMatchObject({ iso: '2026-11-24', day: '۳', label: 'سه‌شنبه ۳ آذر ۱۴۰۵' });
    expect(days.at(-1)?.iso).toBe('2027-01-02');
  });

  it('greys out the days of this month that have passed', () => {
    const azar = months[0];
    expect(azar.cells.slice(0, 2).map((c) => [c.day, c.enabled])).toEqual([
      ['۱', false],
      ['۲', false],
    ]);
    expect(azar.cells).toHaveLength(30); // Azar has 30 days
  });

  it('starts the grid on the right weekday (Saturday first)', () => {
    // 1 Azar 1405 (22 Nov 2026) is a Sunday → 1 blank; 1 Dey 1405 (22 Dec) is a Tuesday → 3 blanks.
    expect(months[0].lead).toBe(1);
    expect(months[1].lead).toBe(3);
    expect(months[1].cells[0]).toMatchObject({ day: '۱', iso: '2026-12-22', enabled: true });
  });
});
