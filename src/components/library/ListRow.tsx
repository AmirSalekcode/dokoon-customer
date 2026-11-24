import { Art } from '../primitives/Art';
import { Icon } from '../primitives/Icon';
import { Badge } from './Badge';
import s from './ListRow.module.css';

export interface ListRowProps {
  title: string;
  sub?: string;
  meta?: string;
  /** Struck-through old value under `meta` (e.g. a food's price before its discount). */
  metaOld?: string;
  /** Small red badge under the title (e.g. «۱۰٪ تخفیف»). */
  badge?: string;
  /** Illustration id/url, or… */
  art?: string;
  /** …a line icon path. */
  d?: string;
  /** Unread dot. */
  dot?: boolean;
  /** What the dot means for screen readers (default «خوانده‌نشده»). */
  dotLabel?: string;
  onTap?: () => void;
}

/** Generic tappable row (account, notifications, settings). */
export function ListRow({
  title,
  sub,
  meta,
  metaOld,
  badge,
  art,
  d,
  dot,
  dotLabel = 'خوانده‌نشده',
  onTap,
}: ListRowProps) {
  return (
    <button type="button" className={s.r} onClick={onTap}>
      <span className={s.ib}>
        {art ? <Art src={art} className={s.art} /> : d ? <Icon d={d} /> : null}
        {dot ? (
          <>
            <i className={s.dt} aria-hidden="true" />
            <span className="visually-hidden">{dotLabel}</span>
          </>
        ) : null}
      </span>
      <span className={s.tx}>
        <span className={s.t}>{title}</span>
        {sub ? <span className={s.s}>{sub}</span> : null}
        {badge ? (
          <span className={s.b}>
            <Badge text={badge} />
          </span>
        ) : null}
      </span>
      {meta ? (
        <span className={s.m}>
          {meta}
          {metaOld ? (
            <s className={s.mo}>
              <span className="visually-hidden">قیمت قبلی </span>
              {metaOld}
            </s>
          ) : null}
        </span>
      ) : null}
      <Icon name="forward" size={20} className={s.cv} />
    </button>
  );
}
