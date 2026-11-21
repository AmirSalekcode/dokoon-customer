import { useEffect, useId, useRef } from 'react';
import { Art } from '@/components/primitives/Art';
import s from './TripSummary.module.css';

export interface TripSummaryProps {
  /** Pre-formatted earnings of this trip, «۶۸٬۰۰۰ تومان». */
  earn: string;
  /** Details, e.g. سفارش / ‌مسیر / پرداخت / نقد دریافتی. */
  rows: { label: string; value: string }[];
  onDone: () => void;
}

/** «Delivered» summary after `deliver`: floating art, earnings, the trip details, back to orders. */
export function TripSummary({ earn, rows, onDone }: TripSummaryProps) {
  // Focus lands on the summary so screen readers announce it (a screen, not a dialog: no focus trap).
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <section ref={ref} className={s.card} aria-labelledby={titleId} tabIndex={-1}>
      <Art src="dk-cake" className={s.art} />
      <h2 id={titleId}>سفارش تحویل شد، دست شما درد نکند</h2>
      <p className={s.earn}>{earn}</p>
      <small className={s.sub}>به درآمد امروز اضافه شد</small>
      {rows.length ? (
        <dl className={s.rows}>
          {rows.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <button type="button" className={s.done} onClick={onDone}>
        بازگشت به سفارش‌ها
      </button>
    </section>
  );
}
