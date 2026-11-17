import { Icon } from '../primitives/Icon';
import s from './TopBar.module.css';

export interface TopBarProps {
  title: string;
  actionLabel?: string;
  /** Omit to hide the back button (root screens). */
  onBack?: () => void;
  onAction?: () => void;
}

/** Inner-screen top bar: back, title, optional text action. */
export function TopBar({ title, actionLabel, onBack, onAction }: TopBarProps) {
  return (
    <header className={s.tb}>
      {onBack ? (
        <button type="button" className={s.bk} aria-label="بازگشت" onClick={onBack}>
          <Icon name="back" />
        </button>
      ) : null}
      <h2 className={s.tt}>{title}</h2>
      {actionLabel ? (
        <button type="button" className={s.ac} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </header>
  );
}
