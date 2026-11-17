import { Icon } from '../primitives/Icon';
import s from './MenuList.module.css';

export interface MenuItemVM {
  id: string;
  label: string;
  /** Icon path data. */
  d: string;
  badge?: string;
  /** Destructive (logout) styling. */
  out?: boolean;
  onPick?: () => void;
}

export interface MenuListProps {
  groups: { id: string; items: MenuItemVM[] }[];
}

/** Grouped, data-driven menu (account tab, hamburger drawer). */
export function MenuList({ groups }: MenuListProps) {
  return (
    <div>
      {groups.map((g) => (
        <div key={g.id} className={s.gp}>
          {g.items.map((i) => (
            <button
              key={i.id}
              type="button"
              className={[s.it, i.out && s.out].filter(Boolean).join(' ')}
              onClick={i.onPick}
            >
              <span className={s.ib}>
                <Icon d={i.d} />
              </span>
              <span className={s.lb}>{i.label}</span>
              {i.badge ? <span className={s.bg}>{i.badge}</span> : null}
              <Icon name="forward" className={s.cv} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
