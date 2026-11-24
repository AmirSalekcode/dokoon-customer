import { Art } from '@/components/primitives/Art';
import s from './MenuItemRow.module.css';

export interface MenuItemRowProps {
  /** Pre-formatted texts (the parent formats Persian prices). `art`: sprite key or approved photo URL. */
  item: {
    name: string;
    price: string;
    old?: string;
    art?: string;
    available: boolean;
    /** Running discount (D-131): badge «۱۰٪ تخفیف» / «جشنواره ۱۰٪» and «تا ۳ روز دیگر». */
    discount?: { badge: string; ends?: string };
  };
  busy?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  /** «پایان تخفیف» quick action (shown with `item.discount`). */
  onEndDiscount?: () => void;
}

/** A dish of the menu with its instant available/unavailable switch (restaurant component library). */
export function MenuItemRow({ item, busy, onToggle, onEdit, onEndDiscount }: MenuItemRowProps) {
  const on = item.available;
  const d = item.discount;
  return (
    <div className={[s.box, !on && s.off].filter(Boolean).join(' ')}>
      <div className={s.r}>
        <button type="button" className={s.ed} aria-label={`ویرایش ${item.name}`} onClick={onEdit}>
          <span className={s.ar}>
            <Art src={item.art} />
          </span>
          <span className={s.tx}>
            <span className={s.n}>{item.name}</span>
            <span className={s.pr}>
              {item.price}
              {item.old ? <s aria-label={`قیمت قبلی ${item.old}`}>{item.old}</s> : null}
            </span>
            <span className={s.st}>{on ? 'موجود' : 'ناموجود'}</span>
          </span>
        </button>
        <button
          type="button"
          className={[s.sw, on && s.on].filter(Boolean).join(' ')}
          role="switch"
          aria-checked={on}
          aria-label={`موجود بودن ${item.name}`}
          aria-busy={busy || undefined}
          disabled={busy}
          onClick={onToggle}
        />
      </div>
      {d ? (
        <div className={s.dc}>
          <span className={s.tag}>{d.badge}</span>
          {d.ends ? <span className={s.ends}>{d.ends}</span> : null}
          {onEndDiscount ? (
            <button
              type="button"
              className={s.end}
              aria-label={`پایان تخفیف ${item.name}`}
              onClick={onEndDiscount}
            >
              پایان تخفیف
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
