import type { TabId } from '@/nav/types';
import { Icon, type IconName } from '../primitives/Icon';
import s from './BottomNav.module.css';

export interface BottomNavProps {
  active: TabId;
  /** Pre-formatted cart count (Persian digits); hidden when empty. */
  cartBadge?: string;
  onPick: (tab: TabId) => void;
}

const ITEMS: { key: TabId; label: string; icon: IconName }[] = [
  { key: 'home', label: 'خانه', icon: 'home' },
  { key: 'restaurants', label: 'رستوران‌ها', icon: 'grid' },
  { key: 'cart', label: 'سبد خرید', icon: 'bag' },
  { key: 'offers', label: 'تخفیف‌ها', icon: 'tag' },
  { key: 'account', label: 'حساب', icon: 'user' },
];

/** Bottom tab bar: home, restaurants, cart (center, with count), offers, account. */
export function BottomNav({ active, cartBadge, onPick }: BottomNavProps) {
  return (
    <nav className={s.bn} aria-label="منوی اصلی">
      {ITEMS.map((it) =>
        it.key === 'cart' ? (
          <button
            key={it.key}
            type="button"
            className={`${s.it} ${s.md}`}
            aria-label={cartBadge ? `${it.label}، ${cartBadge} قلم` : it.label}
            aria-current={active === it.key ? 'page' : undefined}
            onClick={() => onPick(it.key)}
          >
            <Icon name={it.icon} />
            {cartBadge ? <span className={s.bd}>{cartBadge}</span> : null}
          </button>
        ) : (
          <button
            key={it.key}
            type="button"
            className={[s.it, active === it.key && s.on].filter(Boolean).join(' ')}
            aria-current={active === it.key ? 'page' : undefined}
            onClick={() => onPick(it.key)}
          >
            <Icon name={it.icon} />
            {it.label}
          </button>
        ),
      )}
    </nav>
  );
}
