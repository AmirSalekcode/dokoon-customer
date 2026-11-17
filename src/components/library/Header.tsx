import { Icon } from '../primitives/Icon';
import { Logo } from '../primitives/Logo';
import s from './Header.module.css';

export interface HeaderProps {
  address: string;
  /** Pre-formatted cart count; the cart is reached from BottomNav, this badge mirrors it on the menu button. */
  cartCount?: string;
  hasCart?: boolean;
  onMenu?: () => void;
  onCart?: () => void;
  onAddress?: () => void;
}

/** Home header: hamburger (right), address chip (center), logo (left). */
export function Header({ address, onMenu, onAddress }: HeaderProps) {
  return (
    <header className={s.hd}>
      <button type="button" className={s.hb} aria-label="منو" onClick={onMenu}>
        <Icon name="menu" size={20} />
      </button>
      <button
        type="button"
        className={s.ch}
        aria-label={`آدرس تحویل: ${address}. تغییر آدرس`}
        onClick={onAddress}
      >
        <Icon name="pin" size={20} className={s.pin} />
        <b>{address}</b>
        <Icon name="chevronDown" size={20} />
      </button>
      <Logo className={s.lg} height={24} />
    </header>
  );
}
