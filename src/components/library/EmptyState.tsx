import type { ReactNode } from 'react';
import { Art } from '../primitives/Art';
import s from './EmptyState.module.css';

export interface EmptyStateProps {
  art?: string;
  title: string;
  text?: string;
  /** Optional action (e.g. «رفتن به رستوران‌ها»). */
  action?: ReactNode;
}

/** Empty list state with art, title and text. */
export function EmptyState({ art = 'dk-all', title, text, action }: EmptyStateProps) {
  return (
    <div className={s.es}>
      <Art src={art} className={s.art} />
      <h4>{title}</h4>
      {text ? <p>{text}</p> : null}
      {action}
    </div>
  );
}
