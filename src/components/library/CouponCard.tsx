import s from './CouponCard.module.css';

export interface CouponCardProps {
  badge: string;
  title: string;
  sub?: string;
  code: string;
  cta?: string;
  onUse?: () => void;
}

/** Promo code card: badge, title, code, use/copy button. */
export function CouponCard({ badge, title, sub, code, cta = 'استفاده', onUse }: CouponCardProps) {
  return (
    <div className={s.c}>
      <span className={s.pc}>{badge}</span>
      <span className={s.tx}>
        <span className={s.t}>{title}</span>
        {sub ? <span className={s.s}>{sub}</span> : null}
        <span className={s.cd}>{code}</span>
      </span>
      <button type="button" className={s.b} onClick={onUse} aria-label={`${cta} کد ${code}`}>
        {cta}
      </button>
    </div>
  );
}
