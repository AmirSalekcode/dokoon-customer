import { formatNumber } from '@/lib/format';
import s from './Price.module.css';

export interface PriceProps {
  /** Integer toman — Price formats itself (Persian digits + «تومان»). */
  price: number;
  old?: number | null;
}

/** Price with optional struck-through old price. */
export function Price({ price, old }: PriceProps) {
  return (
    <span className={s.pc}>
      <b>{formatNumber(price)}</b>
      <small>تومان</small>
      {old && old > price ? (
        <s>
          <span className="visually-hidden">قیمت قبلی </span>
          {formatNumber(old)}
        </s>
      ) : null}
    </span>
  );
}
