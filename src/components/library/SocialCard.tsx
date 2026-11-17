import { Icon } from '../primitives/Icon';
import s from './SocialCard.module.css';

export interface SocialCardProps {
  title: string;
  sub?: string;
  handle: string;
  /** Brand icon path data. */
  d: string;
  cta?: string;
  onOpen?: () => void;
}

/** Social network card with handle and follow button. */
export function SocialCard({ title, sub, handle, d, cta = 'دنبال کردن', onOpen }: SocialCardProps) {
  return (
    <div className={s.c}>
      <span className={s.ib}>
        <Icon d={d} size={26} />
      </span>
      <div className={s.tx}>
        <div className={s.n}>{title}</div>
        {sub ? <div className={s.s}>{sub}</div> : null}
        <div className={s.h} dir="ltr">
          {handle}
        </div>
      </div>
      <button type="button" className={s.b} onClick={onOpen} aria-label={`${cta} ${title}`}>
        {cta}
      </button>
    </div>
  );
}
