import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { createPanelApi } from '../api/client';
import { db } from '../mocks/db';
import { panelHandlers, resetPanelMockDb } from '../mocks/handlers';
import { dayError, FROM_TIMES, lineMinutes, normalizeWeek, TO_TIMES, useHours } from './hours';

// KAN-69: weekly hours — 30-minute steps, closing up to 02:00, validation, save.
const BASE = 'http://panel.test/v1';
const api = () => createPanelApi(BASE, { retries: 0 });

beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  useHours.getState().reset();
});

describe('time options', () => {
  it('open from 05:00 to 23:30, close until 02:00 the next night, every 30 minutes', () => {
    expect(FROM_TIMES[0]).toEqual({ value: '05:00', label: '۰۵:۰۰' });
    expect(FROM_TIMES.at(-1)?.value).toBe('23:30');
    expect(TO_TIMES[0].value).toBe('05:30');
    expect(TO_TIMES.at(-1)).toEqual({ value: '02:00', label: '۰۲:۰۰ بامداد' });
    expect(TO_TIMES.find((t) => t.value === '00:00')?.label).toBe('۰۰:۰۰ بامداد');
    expect(new Set(TO_TIMES.map((t) => t.value)).size).toBe(TO_TIMES.length);
  });

  it('after-midnight times sort after the evening', () => {
    expect(lineMinutes('00:30')).toBeGreaterThan(lineMinutes('23:30'));
    expect(lineMinutes('x')).toBeNaN();
  });
});

describe('dayError', () => {
  it('closed days are always valid', () => {
    expect(dayError({ day: 0, on: false, from: '23:00', to: '10:00' })).toBeUndefined();
  });
  it('closing must follow opening; after midnight is allowed up to 02:00', () => {
    expect(dayError({ day: 0, on: true, from: '11:00', to: '23:00' })).toBeUndefined();
    expect(dayError({ day: 0, on: true, from: '18:00', to: '01:30' })).toBeUndefined();
    expect(dayError({ day: 0, on: true, from: '12:00', to: '12:00' })).toBe(
      'ساعت پایان باید بعد از ساعت شروع باشد',
    );
    expect(dayError({ day: 0, on: true, from: '20:00', to: '11:00' })).toBe(
      'ساعت پایان باید بعد از ساعت شروع باشد',
    );
    expect(dayError({ day: 0, on: true, from: '20:00', to: '03:00' })).toBe(
      'ساعت پایان حداکثر ۰۲:۰۰ بامداد است',
    );
  });
});

describe('hours store', () => {
  it('normalizes to seven days in order', () => {
    const w = normalizeWeek([{ day: 3, on: true, from: '10:00', to: '22:00' }]);
    expect(w.map((d) => d.day)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(w[3]).toEqual({ day: 3, on: true, from: '10:00', to: '22:00' });
    expect(w[0].on).toBe(false);
  });

  it('loads and saves the week', async () => {
    await useHours.getState().load(api());
    const days = useHours.getState().days!;
    expect(days).toHaveLength(7);
    const next = days.map((d) => (d.day === 6 ? { ...d, on: true, from: '12:00', to: '02:00' } : d));
    expect(await useHours.getState().save(next, api())).toBeNull();
    expect(db.hours.find((d) => d.day === 6)).toMatchObject({ on: true, to: '02:00' });
  });

  it('an invalid day is not sent; a server error message is returned', async () => {
    await useHours.getState().load(api());
    const bad = useHours
      .getState()
      .days!.map((d) => (d.day === 0 ? { ...d, from: '22:00', to: '10:00' } : d));
    expect(await useHours.getState().save(bad, api())).toBe('ساعت‌ها را درست کنید');
    server.use(
      http.put(`${BASE}/r/hours`, () =>
        HttpResponse.json({ code: 'X', message: 'ذخیره نشد' }, { status: 400 }),
      ),
    );
    expect(await useHours.getState().save(useHours.getState().days!, api())).toBe('ذخیره نشد');
  });
});
