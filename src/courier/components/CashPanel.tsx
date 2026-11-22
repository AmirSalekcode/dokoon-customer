import { useId } from 'react';
import s from './CashPanel.module.css';

export interface CashPanelProps {
  /** Pre-formatted amount to collect, «۴۱۲٬۰۰۰ تومان». */
  due: string;
  /** What the courier typed (the screen normalises digits and formats). */
  value: string;
  /** Warning, e.g. a mismatch with the due amount. It never blocks delivery (courier rule 5). */
  error?: string;
  onInput: (value: string) => void;
  /** «مبلغ دقیق دریافت شد»: the screen fills in the due amount. */
  onExact: () => void;
}

/** Cash collection at delivery: amount due, the collected amount, mismatch warning. */
export function CashPanel({ due, value, error, onInput, onExact }: CashPanelProps) {
  const inputId = useId();
  const errorId = useId();
  return (
    <div className={s.panel}>
      <p className={s.due}>
        <small>مبلغ قابل دریافت از مشتری (نقد)</small>
        <b>{due}</b>
      </p>
      <div>
        <label className={s.label} htmlFor={inputId}>
          مبلغی که دریافت کردید
        </label>
        <div className={[s.field, error && s.warn].filter(Boolean).join(' ')}>
          <input
            id={inputId}
            className={s.input}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="۰"
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => onInput(e.target.value)}
          />
          <span aria-hidden="true">تومان</span>
        </div>
      </div>
      {error ? (
        <p id={errorId} className={s.error} role="alert">
          {error}
        </p>
      ) : null}
      <button type="button" className={s.exact} onClick={onExact}>
        مبلغ دقیق دریافت شد
      </button>
    </div>
  );
}
