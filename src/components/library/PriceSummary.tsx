import s from './PriceSummary.module.css';

export interface PriceSummaryProps {
  /** Pre-formatted rows; tone 'good' = green (discount, free delivery). */
  rows: { label: string; value: string; tone?: 'good' }[];
  totalLabel: string;
  totalValue: string;
}

/** Totals table: rows + grand total. */
export function PriceSummary({ rows, totalLabel, totalValue }: PriceSummaryProps) {
  return (
    <div className={s.ps}>
      {rows.map((r) => (
        <div key={r.label} className={s.r}>
          <span>{r.label}</span>
          <b className={r.tone === 'good' ? s.good : undefined}>{r.value}</b>
        </div>
      ))}
      <div className={s.t}>
        <span>{totalLabel}</span>
        <span>{totalValue}</span>
      </div>
    </div>
  );
}
