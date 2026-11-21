import { useId } from 'react';
import s from './HoursRow.module.css';

export interface HoursRowProps {
  day: string;
  on: boolean;
  from: string;
  to: string;
  /** Choices (value HH:mm + Persian label); the parent decides the range. */
  fromTimes: { value: string; label: string }[];
  toTimes: { value: string; label: string }[];
  error?: string;
  onFlip: () => void;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}

/** One day of the weekly hours: open switch + from/to (restaurant component library, 358×120). */
export function HoursRow({
  day,
  on,
  from,
  to,
  fromTimes,
  toTimes,
  error,
  onFlip,
  onFrom,
  onTo,
}: HoursRowProps) {
  const errId = useId();
  return (
    <div className={[s.r, !on && s.off].filter(Boolean).join(' ')}>
      <div className={s.d}>
        {day}
        <small>{on ? 'باز' : 'تعطیل'}</small>
      </div>
      <button
        type="button"
        className={[s.sw, on && s.on].filter(Boolean).join(' ')}
        role="switch"
        aria-checked={on}
        aria-label={`باز بودن در ${day}`}
        onClick={onFlip}
      />
      {on ? (
        <div className={s.t}>
          <span aria-hidden="true">از</span>
          <select
            className={s.sl}
            aria-label={`ساعت شروع ${day}`}
            value={from}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
            onChange={(e) => onFrom(e.target.value)}
          >
            {fromTimes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <span aria-hidden="true">تا</span>
          <select
            className={s.sl}
            aria-label={`ساعت پایان ${day}`}
            value={to}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
            onChange={(e) => onTo(e.target.value)}
          >
            {toTimes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {on && error ? (
        <p id={errId} className={s.err} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
