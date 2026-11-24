import { useState } from 'react';
import { WEEKDAY_HEADERS, type CalendarMonth } from '@/lib/jalali';
import s from './JalaliDatePicker.module.css';

export interface JalaliDatePickerProps {
  /** Month grids from `calendarMonths()`; disabled cells cannot be picked. */
  months: CalendarMonth[];
  /** Picked Tehran day `YYYY-MM-DD` ('' = none). */
  value: string;
  onPick: (iso: string) => void;
  /** Accessible name of the calendar, e.g. «روز پایان تخفیف». */
  label: string;
}

/** RTL: «ماه قبل» sits on the right and points right; «ماه بعد» on the left. */
const Chevron = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Jalali month calendar (Saturday first) with previous/next month; one month at a time. */
export function JalaliDatePicker({ months, value, onPick, label }: JalaliDatePickerProps) {
  const picked = months.findIndex((m) => m.cells.some((c) => c.iso === value));
  const [index, setIndex] = useState(picked >= 0 ? picked : 0);
  const month = months[Math.min(index, months.length - 1)];
  if (!month) return null;
  const chosen = month.cells.find((c) => c.iso === value);
  return (
    <div className={s.cal} role="group" aria-label={label}>
      <div className={s.head}>
        <button
          type="button"
          className={s.nav}
          aria-label="ماه قبل"
          disabled={index <= 0}
          onClick={() => setIndex(index - 1)}
        >
          <Chevron d="M9 6l6 6-6 6" />
        </button>
        <span className={s.title} aria-live="polite">
          {month.title}
        </span>
        <button
          type="button"
          className={s.nav}
          aria-label="ماه بعد"
          disabled={index >= months.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          <Chevron d="M15 6l-6 6 6 6" />
        </button>
      </div>
      <div className={s.grid}>
        {WEEKDAY_HEADERS.map((w) => (
          <span key={w} className={s.wd} aria-hidden="true">
            {w}
          </span>
        ))}
        {Array.from({ length: month.lead }, (_, i) => (
          <span key={`b${i}`} aria-hidden="true" />
        ))}
        {month.cells.map((c) => (
          <button
            key={c.iso}
            type="button"
            className={[s.day, c.iso === value && s.on].filter(Boolean).join(' ')}
            aria-label={c.label}
            aria-pressed={c.iso === value}
            disabled={!c.enabled}
            onClick={() => onPick(c.iso)}
          >
            {c.day}
          </button>
        ))}
      </div>
      {chosen ? <p className={s.sel}>پایان: {chosen.label}، ساعت ۲۳:۵۹</p> : null}
    </div>
  );
}
