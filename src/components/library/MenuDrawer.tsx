import { greeting } from '@/lib/format';
import { Sheet } from '../base/Sheet';
import { Icon } from '../primitives/Icon';
import { Logo } from '../primitives/Logo';
import { MenuList, type MenuListProps } from './MenuList';
import s from './MenuDrawer.module.css';

export interface MenuDrawerProps {
  user: { name: string; initial: string; phone: string };
  city: string;
  groups: MenuListProps['groups'];
  version: string;
  onClose: () => void;
}

/** Hamburger drawer: «سلام {نام} عزیز», city, menu groups, version. */
export function MenuDrawer({ user, city, groups, version, onClose }: MenuDrawerProps) {
  return (
    <Sheet label="منو" onClose={onClose} side>
      <button type="button" className={s.x} aria-label="بستن منو" onClick={onClose}>
        <Icon name="close" />
      </button>
      <div className={s.pf}>
        <span className={s.av} aria-hidden="true">
          {user.initial}
        </span>
        <div>
          <h2>{greeting(user.name)}</h2>
          <p>{user.phone}</p>
        </div>
      </div>
      <div className={s.md}>
        <div className={s.cy}>
          <span className={s.ib}>
            <Icon name="pin" />
          </span>
          <span>
            <small>شهر شما</small>
            <b>{city}</b>
          </span>
        </div>
        <div className={s.list}>
          <MenuList groups={groups} />
        </div>
      </div>
      <div className={s.ft}>
        <Logo height={28} />
        <small>نسخه {version}</small>
      </div>
    </Sheet>
  );
}
