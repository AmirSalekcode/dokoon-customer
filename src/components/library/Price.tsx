import { formatNumber, toFaDigits } from '@/lib/format';
import s from './Price.module.css';

export interface PriceProps {
  /** Integer toman — Price formats itself (Persian digits + «تومان»). */
  price: number;
  old?: number | null;
  /** Discount percent (D-131): screen readers hear «قیمت قبلی …، قیمت با ۱۰٪ تخفیف … تومان». */
  percent?: number;
}

/** Price with optional struck-through old price. */
export function Price({ price, old, percent }: PriceProps) {
  const struck = !!old && old > price;
  if (struck && percent)
    return (
      <span className={s.pc}>
        <span className="visually-hidden">
          {`قیمت قبلی ${formatNumber(old)}، قیمت با ${toFaDigits(percent)}٪ تخفیف ${formatNumber(price)} تومان`}
        </span>
        <b aria-hidden="true">{formatNumber(price)}</b>
        <small aria-hidden="true">تومان</small>
        <s aria-hidden="true">{formatNumber(old)}</s>
      </span>
    );
  return (
    <span className={s.pc}>
      <b>{formatNumber(price)}</b>
      <small>تومان</small>
      {struck ? (
        <s>
          <span className="visually-hidden">قیمت قبلی </span>
          {formatNumber(old)}
        </s>
      ) : null}
    </span>
  );
}
