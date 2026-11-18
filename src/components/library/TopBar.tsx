import { Icon } from '../primitives/Icon';
import s from './TopBar.module.css';

export interface TopBarProps {
  title: string;
  actionLabel?: string;
  /** Omit to hide the back button (root screens). */
  onBack?: () => void;
  onAction?: () => void;
  /** Heading level of the title: 1 when the bar is the page's main heading (default 2). */
  level?: 1 | 2;
}

/** Inner-screen top bar: back, title, optional text action. */
export function TopBar({ title, actionLabel, onBack, onAction, level = 2 }: TopBarProps) {
  const H = level === 1 ? 'h1' : 'h2';
  return (
    <header className={s.tb}>
      {onBack ? (
        <button type="button" className={s.bk} aria-label="بازگشت" onClick={onBack}>
          <Icon name="back" />
        </button>
      ) : null}
      <H className={s.tt}>{title}</H>
      {actionLabel ? (
        <button type="button" className={s.ac} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </header>
  );
}
