import type { KeyboardEvent } from 'react';
import { Art } from '../primitives/Art';
import { Icon } from '../primitives/Icon';
import { Badge, type BadgeTone } from './Badge';
import { Rating } from './Rating';
import s from './RestaurantCard.module.css';

/** View model — build it with `toRestaurantCardVM()` from the API RestaurantCard. */
export interface RestaurantCardData {
  name: string;
  sub?: string;
  art?: string;
  km?: string;
  rating?: string;
  reviews?: string;
  /** ETA set by the restaurant, display only, e.g. «۲۵–۳۵». */
  eta?: string;
  feeText?: string;
  free?: boolean;
  badge?: string;
  badgeTone?: BadgeTone;
  isOpen?: boolean;
  fav?: boolean;
}

export interface RestaurantCardProps {
  r: RestaurantCardData;
  onOpen?: () => void;
  onFav?: () => void;
}

/** Restaurant card: cover art, badge, rating, ETA, delivery fee, favorite. */
export function RestaurantCard({ r, onOpen, onFav }: RestaurantCardProps) {
  const onKey = (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onOpen?.();
    }
  };
  return (
    <div className={s.rc} role="button" tabIndex={0} aria-label={r.name} onClick={onOpen} onKeyDown={onKey}>
      <div className={s.rp}>
        <Art src={r.art} className={s.rf} />
        {r.badge ? (
          <span className={s.rb}>
            <Badge text={r.badge} tone={r.badgeTone} />
          </span>
        ) : null}
        {onFav ? (
          <button
            type="button"
            className={[s.rh, r.fav && s.on].filter(Boolean).join(' ')}
            aria-label={r.fav ? `حذف ${r.name} از علاقه‌مندی‌ها` : `افزودن ${r.name} به علاقه‌مندی‌ها`}
            aria-pressed={!!r.fav}
            onClick={(e) => {
              e.stopPropagation();
              onFav();
            }}
          >
            <i>
              <Icon name="heart" size={16} />
            </i>
          </button>
        ) : null}
        {r.isOpen === false ? <span className={s.rx}>بسته است</span> : null}
      </div>
      <h3 className={s.rn}>{r.name}</h3>
      <p className={s.rs}>
        {r.sub}
        {r.km ? ` · ${r.km} کیلومتر` : ''}
      </p>
      {r.rating ? (
        <div className={s.rr}>
          <Rating value={r.rating} count={r.reviews} />
        </div>
      ) : null}
      <div className={s.rm}>
        <span>{r.eta ? `${r.eta} دقیقه` : ''}</span>
        <strong className={r.free ? s.free : undefined}>{r.feeText}</strong>
      </div>
    </div>
  );
}
