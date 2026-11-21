import { Icon } from '@/components/primitives/Icon';
import s from './RBottomNav.module.css';

export interface RNavItem<K extends string = string> {
  key: K;
  label: string;
  /** Icon path (24×24). */
  d: string;
  /** Pre-formatted badge (e.g. new orders «۲»); empty = none. */
  badge?: string;
  /** Spoken with the badge, e.g. «۲ سفارش جدید». */
  badgeLabel?: string;
}

export interface RBottomNavProps<K extends string> {
  /** Spoken name of the navigation, e.g. «بخش‌های رستوران» / «بخش‌های پیک». */
  label: string;
  items: RNavItem<K>[];
  active: K;
  onPick: (key: K) => void;
}

/**
 * Flat tab navigation of the restaurant and courier apps: bottom bar on phones (<720), side rail
 * (`--rail-w`) on tablets/desktop. The switch is pure CSS (media query), so one component serves both
 * layouts. Needs the app delta tokens `--rail-w` / `--rail-item-h` (restaurant and courier define them).
 */
export function RBottomNav<K extends string>({ label, items, active, onPick }: RBottomNavProps<K>) {
  return (
    <nav className={s.nav} aria-label={label}>
      {items.map((it) => {
        const on = it.key === active;
        return (
          <button
            key={it.key}
            type="button"
            className={[s.item, on && s.on].filter(Boolean).join(' ')}
            aria-current={on ? 'page' : undefined}
            aria-label={it.badge && it.badgeLabel ? `${it.label}، ${it.badgeLabel}` : undefined}
            onClick={() => onPick(it.key)}
          >
            <span className={s.icon}>
              <Icon d={it.d} />
              {it.badge ? (
                <i className={s.badge} aria-hidden="true">
                  {it.badge}
                </i>
              ) : null}
            </span>
            <span className={s.label}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
