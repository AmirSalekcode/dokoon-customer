import s from './OfferCard.module.css';

/** A nearby offer, pre-formatted by the screen. Neighbourhoods only, never a full address (courier rule 2). */
export interface OfferView {
  rest: string;
  /** «۶۸٬۰۰۰ تومان» */
  earn: string;
  /** Pickup neighbourhood. */
  from: string;
  /** Drop-off neighbourhood. */
  to: string;
  /** «۲٫۴ کیلومتر» */
  dist: string;
  /** «۱۲ دقیقه» */
  time: string;
  /** «نقدی · دریافت از مشتری» / «پرداخت آنلاین» */
  pay: string;
  /** Cash order: the pay chip is highlighted. */
  cash: boolean;
}

export interface OfferCardProps {
  offer: OfferView;
  onOpen: () => void;
}

/** Offer card in the Orders tab; tapping opens the offer alert. */
export function OfferCard({ offer: o, onOpen }: OfferCardProps) {
  return (
    <button type="button" className={s.card} onClick={onOpen}>
      <span className={s.head}>
        <b>{o.rest}</b>
        <span className={s.earn}>{o.earn}</span>
      </span>
      <span className={s.route}>
        <span className={s.dots} aria-hidden="true">
          <i />
          <u />
          <i />
        </span>
        <span className={s.places}>
          <span>
            <small>مبدأ</small>
            {o.from}
          </span>
          <span>
            <small>مقصد</small>
            {o.to}
          </span>
        </span>
      </span>
      <span className={s.meta}>
        <span>{o.dist}</span>
        <span>{o.time}</span>
        <span className={o.cash ? s.cash : undefined}>{o.pay}</span>
      </span>
    </button>
  );
}
