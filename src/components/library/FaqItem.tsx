import { useId } from 'react';
import { Icon } from '../primitives/Icon';
import s from './FaqItem.module.css';

export interface FaqItemProps {
  q: string;
  a: string;
  open?: boolean;
  onToggle?: () => void;
}

/** FAQ accordion item. */
export function FaqItem({ q, a, open, onToggle }: FaqItemProps) {
  const id = useId();
  return (
    <div className={[s.c, open && s.on].filter(Boolean).join(' ')}>
      <button type="button" className={s.q} aria-expanded={!!open} aria-controls={id} onClick={onToggle}>
        <span>{q}</span>
        <Icon name="forward" size={20} className={s.cv} />
      </button>
      {open ? (
        <p id={id} className={s.a}>
          {a}
        </p>
      ) : null}
    </div>
  );
}
