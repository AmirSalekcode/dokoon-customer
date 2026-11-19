import { Art, resolveArt } from '../primitives/Art';
import { Icon } from '../primitives/Icon';
import s from './RestaurantHeader.module.css';

export interface RestaurantHeaderData {
  name: string;
  sub?: string;
  /** Real cover photo URL, or art id for the illustrated cover. */
  cover?: string;
  art?: string;
  km?: string;
  rating?: string;
  reviews?: string;
  eta?: string;
  feeShort?: string;
  hours?: string;
  isOpen?: boolean;
  /** e.g. «فردا ساعت ۹:۰۰» */
  opensNext?: string;
  offer?: string;
  fav?: boolean;
}

export interface RestaurantHeaderProps {
  r: RestaurantHeaderData;
  onBack?: () => void;
  onFav?: () => void;
  onShare?: () => void;
}

/** Restaurant page header: cover, back/share/favorite, info card, closed/offer banners. */
export function RestaurantHeader({ r, onBack, onFav, onShare }: RestaurantHeaderProps) {
  const photo = r.cover && 'url' in resolveArt(r.cover) ? r.cover : null;
  const closed = r.isOpen === false;
  return (
    <section className={s.rh} aria-label={r.name}>
      <div className={s.cv}>
        {photo ? <img className={s.photo} src={photo} alt="" /> : <Art src={r.art} className={s.art} />}
        <div className={s.tb}>
          <button type="button" aria-label="بازگشت" onClick={onBack}>
            <Icon name="back" />
          </button>
          <div className={s.g}>
            <button type="button" aria-label="اشتراک‌گذاری" onClick={onShare}>
              <Icon name="share" />
            </button>
            <button
              type="button"
              className={r.fav ? s.on : undefined}
              aria-label={r.fav ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
              aria-pressed={!!r.fav}
              onClick={onFav}
            >
              <Icon name="heart" />
            </button>
          </div>
        </div>
      </div>
      <div className={s.info}>
        <div className={s.nm}>
          <span className={s.lg}>
            <Art src={r.art} className={s.lgArt} />
          </span>
          <div>
            <h1>{r.name}</h1>
            <p>
              {r.sub}
              {r.km ? ` · ${r.km} کیلومتر` : ''}
            </p>
          </div>
          <span className={[s.st, closed ? s.no : s.ok].join(' ')}>{closed ? 'بسته' : 'باز'}</span>
        </div>
        <div className={s.stats}>
          <div>
            <b>
              <span className={s.star} aria-hidden="true">
                ★
              </span>{' '}
              {r.rating}
            </b>
            {r.reviews} نظر
          </div>
          <div>
            <b>{r.eta}</b>
            دقیقه
          </div>
          <div>
            <b>{r.feeShort}</b>
            هزینه ارسال
          </div>
        </div>
        <div className={s.rw}>
          <span>
            ساعت کاری: <b>{r.hours}</b>
          </span>
        </div>
      </div>
      {closed ? (
        <div className={s.cl} role="status">
          <Icon name="clock" />
          <span>
            این رستوران الان بسته است. <b>بازشدن بعدی: {r.opensNext}</b>
          </span>
        </div>
      ) : r.offer ? (
        <div className={s.of}>
          <Icon name="tag" />
          <span>{r.offer}</span>
        </div>
      ) : null}
    </section>
  );
}
