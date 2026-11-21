import { create } from 'zustand';
import { toFaDigits } from '@/lib/format';
import { panelApi, type PanelApi } from '../api/client';
import { businessError } from '../api/errors';
import type { DayHours } from '../api/types';
import { showFullPageError } from '../errors/fullPage';

/** Day 0 = Saturday (contract). */
export const DAY_NAMES = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'] as const;

/** The working day starts at 05:00; times before that belong to the night after (up to 02:00). */
const DAY_START_MIN = 5 * 60;
const LAST_CLOSE_MIN = 26 * 60; // 02:00 of the next day
const STEP = 30;

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

/** Minutes on the working-day line (05:00 → 300 … 02:00 next day → 1560). */
export function lineMinutes(t: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) return NaN;
  const v = Number(m[1]) * 60 + Number(m[2]);
  return v < DAY_START_MIN ? v + 24 * 60 : v;
}

export interface TimeOption {
  value: string;
  label: string;
}
const option = (min: number): TimeOption => ({
  value: hhmm(min),
  label: toFaDigits(hhmm(min)) + (min >= 24 * 60 ? ' بامداد' : ''),
});

/** Opening times: 05:00 … 23:30 every 30 minutes. */
export const FROM_TIMES: TimeOption[] = Array.from({ length: (24 * 60 - DAY_START_MIN) / STEP }, (_, i) =>
  option(DAY_START_MIN + i * STEP),
);
/** Closing times: 05:30 … 02:00 (next day) every 30 minutes (screen specs §5). */
export const TO_TIMES: TimeOption[] = Array.from(
  { length: (LAST_CLOSE_MIN - DAY_START_MIN) / STEP },
  (_, i) => option(DAY_START_MIN + (i + 1) * STEP),
);

/** A day that is open needs a closing time after its opening time (at most 02:00 the next night). */
export function dayError(d: DayHours): string | undefined {
  if (!d.on) return undefined;
  const a = lineMinutes(d.from ?? '');
  const b = lineMinutes(d.to ?? '');
  if (Number.isNaN(a) || Number.isNaN(b)) return 'ساعت شروع و پایان را انتخاب کنید';
  if (b <= a) return 'ساعت پایان باید بعد از ساعت شروع باشد';
  if (b > LAST_CLOSE_MIN) return 'ساعت پایان حداکثر ۰۲:۰۰ بامداد است';
  return undefined;
}

/** Always 7 days in order 0..6; missing days are closed with a default range. */
export function normalizeWeek(list: DayHours[]): DayHours[] {
  return Array.from({ length: 7 }, (_, day) => {
    const d = list.find((x) => x.day === day);
    return { day, on: !!d?.on, from: d?.from ?? '11:00', to: d?.to ?? '23:00' };
  });
}

interface HoursState {
  days: DayHours[] | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  load: (api?: PanelApi) => Promise<void>;
  /** Resolves null when saved, else the message to show. */
  save: (days: DayHours[], api?: PanelApi) => Promise<string | null>;
  reset: () => void;
}

/** Weekly opening hours (`GET/PUT /r/hours`). The manual open/closed switch never changes them. */
export const useHours = create<HoursState>((set, get) => ({
  days: null,
  status: 'idle',
  load: async (api = panelApi()) => {
    set({ status: 'loading' });
    try {
      const { data, error } = await api.GET('/r/hours');
      if (error !== undefined || !data) throw error ?? new Error('empty hours');
      set({ days: normalizeWeek(data), status: 'ready' });
    } catch (e) {
      set({ status: 'error' });
      showFullPageError(e, () => void get().load(api));
    }
  },
  save: async (days, api = panelApi()) => {
    if (days.some((d) => dayError(d))) return 'ساعت‌ها را درست کنید';
    try {
      const { error } = await api.PUT('/r/hours', { body: days });
      if (error !== undefined) return businessError(error)?.message ?? '';
      set({ days, status: 'ready' });
      return null;
    } catch (e) {
      showFullPageError(e, () => void get().save(days, api));
      return 'ساعت کاری ذخیره نشد؛ دوباره تلاش کنید';
    }
  },
  reset: () => set({ days: null, status: 'idle' }),
}));
