import { Art } from '../primitives/Art';
import { Icon } from '../primitives/Icon';
import s from './ContactRow.module.css';

export interface ContactRowProps {
  title: string;
  sub?: string;
  art?: string;
  href: string;
}

/** Contact link row (phone / messenger). */
export function ContactRow({ title, sub, art = 'dk-all', href }: ContactRowProps) {
  return (
    <a className={s.cr} href={href} aria-label={`تماس با ${title}`}>
      <span className={s.ib}>
        <Art src={art} className={s.art} />
      </span>
      <span className={s.tx}>
        <b>{title}</b>
        {sub ? <small>{sub}</small> : null}
      </span>
      <span className={s.call}>
        <Icon name="phone" />
      </span>
    </a>
  );
}
