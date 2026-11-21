import { useId } from 'react';
import { Icon } from '@/components/primitives/Icon';
import s from './PermissionCard.module.css';

export interface PermissionView {
  title: string;
  /** Why the app needs it. */
  text: string;
  /** Icon path (24×24). */
  d: string;
  granted: boolean;
  /** Button text; defaults to «اجازه می‌دهم». */
  cta?: string;
}

export interface PermissionCardProps {
  perm: PermissionView;
  onGrant: () => void;
}

/** Device permission (location, notifications, battery): state chip and a grant button while missing. */
export function PermissionCard({ perm: p, onGrant }: PermissionCardProps) {
  const titleId = useId();
  const textId = useId();
  return (
    <section className={s.card} aria-labelledby={titleId}>
      <div className={s.head}>
        <span className={s.icon} aria-hidden="true">
          <Icon d={p.d} />
        </span>
        <h2 id={titleId}>{p.title}</h2>
        <span className={[s.state, p.granted && s.on].filter(Boolean).join(' ')}>
          {p.granted ? 'فعال' : 'لازم است'}
        </span>
      </div>
      <p id={textId}>{p.text}</p>
      {p.granted ? null : (
        <button type="button" className={s.grant} onClick={onGrant} aria-describedby={textId}>
          {p.cta ?? 'اجازه می‌دهم'}
        </button>
      )}
    </section>
  );
}
