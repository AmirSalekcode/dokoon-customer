import s from './HistoryRow.module.css';

export interface HistoryRowView {
  /** «کبابی سنتی زاگرس ← خیابان شریعتی» */
  title: string;
  /** «امروز · ۱۴:۲۰ · ۲٫۴ کیلومتر» */
  sub: string;
  /** «۶۸٬۰۰۰ تومان» */
  earn: string;
  /** «نقدی» / «آنلاین» */
  pay: string;
}

export interface HistoryRowProps {
  order: HistoryRowView;
  onTap: () => void;
}

/** One finished trip in history; opens its details. */
export function HistoryRow({ order: o, onTap }: HistoryRowProps) {
  return (
    <button type="button" className={s.row} onClick={onTap}>
      <span className={s.text}>
        <b>{o.title}</b>
        <small>{o.sub}</small>
      </span>
      <span className={s.earn}>
        {o.earn}
        <small>{o.pay}</small>
      </span>
    </button>
  );
}
