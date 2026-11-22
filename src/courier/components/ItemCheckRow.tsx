import { Icon } from '@/components/primitives/Icon';
import s from './ItemCheckRow.module.css';

export interface ItemCheckView {
  /** Quantity in Persian digits, «۲». */
  q: string;
  name: string;
  /** Options, e.g. «دوغ»; empty = none. */
  opt?: string;
  checked: boolean;
}

export interface ItemCheckRowProps {
  item: ItemCheckView;
  onToggle: () => void;
}

/** One dish to tick at pickup (role=checkbox, 64px row). */
export function ItemCheckRow({ item: it, onToggle }: ItemCheckRowProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={it.checked}
      aria-label={`${it.q} عدد ${it.name}${it.opt ? `، ${it.opt}` : ''}`}
      className={[s.row, it.checked && s.on].filter(Boolean).join(' ')}
      onClick={onToggle}
    >
      <span className={s.box} aria-hidden="true">
        <Icon name="check" size={20} />
      </span>
      <span className={s.q}>{it.q}</span>
      <span className={s.name}>
        {it.name}
        {it.opt ? <small>{it.opt}</small> : null}
      </span>
    </button>
  );
}
