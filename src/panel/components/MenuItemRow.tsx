import { Art } from '@/components/primitives/Art';
import s from './MenuItemRow.module.css';

export interface MenuItemRowProps {
  /** Pre-formatted texts (the parent formats Persian prices). `art`: sprite key or approved photo URL. */
  item: { name: string; price: string; old?: string; art?: string; available: boolean };
  busy?: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

/** A dish of the menu with its instant available/unavailable switch (restaurant component library). */
export function MenuItemRow({ item, busy, onToggle, onEdit }: MenuItemRowProps) {
  const on = item.available;
  return (
    <div className={[s.r, !on && s.off].filter(Boolean).join(' ')}>
      <button type="button" className={s.ed} aria-label={`ویرایش ${item.name}`} onClick={onEdit}>
        <span className={s.ar}>
          <Art src={item.art} />
        </span>
        <span className={s.tx}>
          <span className={s.n}>{item.name}</span>
          <span className={s.pr}>
            {item.price}
            {item.old ? <s>{item.old}</s> : null}
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
  );
}
