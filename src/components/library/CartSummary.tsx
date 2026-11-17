import s from './CartSummary.module.css';

export interface CartSummaryProps {
  /** Pre-formatted count and total (Persian digits). */
  count: string;
  total: string;
  onOpen?: () => void;
}

/** Floating cart bar on the restaurant page; fixed dock color in both themes. */
export function CartSummary({ count, total, onOpen }: CartSummaryProps) {
  return (
    <div className={s.dock}>
      <button type="button" className={s.cs} onClick={onOpen}>
        <span className={s.cl}>
          <span className={s.cn}>{count}</span>
          مشاهده سبد خرید
        </span>
        <span className={s.cp}>
          {total}
          <small>تومان</small>
        </span>
      </button>
    </div>
  );
}
