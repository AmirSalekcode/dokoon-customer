import s from './Rating.module.css';

export interface RatingProps {
  /** Pre-formatted, e.g. «۴٫۸» and «۲۴۵». */
  value: string;
  count?: string;
}

/** Star + rating + review count. */
export function Rating({ value, count }: RatingProps) {
  return (
    <span className={s.rt} aria-label={`امتیاز ${value}${count ? ` از ${count} نظر` : ''}`}>
      <b className={s.rs} aria-hidden="true">
        ★
      </b>
      <span aria-hidden="true">{value}</span>
      {count ? (
        <span className={s.rc} aria-hidden="true">
          ({count})
        </span>
      ) : null}
    </span>
  );
}
