import { Art } from '../primitives/Art';
import { Icon } from '../primitives/Icon';
import s from './ListRow.module.css';

export interface ListRowProps {
  title: string;
  sub?: string;
  meta?: string;
  /** Illustration id/url, or… */
  art?: string;
  /** …a line icon path. */
  d?: string;
  /** Unread dot. */
  dot?: boolean;
  onTap?: () => void;
}

/** Generic tappable row (account, notifications, settings). */
export function ListRow({ title, sub, meta, art, d, dot, onTap }: ListRowProps) {
  return (
    <button type="button" className={s.r} onClick={onTap}>
      <span className={s.ib}>
        {art ? <Art src={art} className={s.art} /> : d ? <Icon d={d} /> : null}
        {dot ? <i className={s.dt} aria-label="خوانده‌نشده" /> : null}
      </span>
      <span className={s.tx}>
        <span className={s.t}>{title}</span>
        {sub ? <span className={s.s}>{sub}</span> : null}
      </span>
      {meta ? <span className={s.m}>{meta}</span> : null}
      <Icon name="forward" size={20} className={s.cv} />
    </button>
  );
}
