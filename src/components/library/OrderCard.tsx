import type { KeyboardEvent } from 'react';
import { Art } from '../primitives/Art';
import { Badge, type BadgeTone } from './Badge';
import s from './OrderCard.module.css';

export interface OrderCardData {
  art?: string;
  name: string;
  /** Order number and date, pre-formatted. */
  no: string;
  date: string;
  statusLabel: string;
  statusTone?: BadgeTone;
  /** e.g. «۲× چلو کباب کوبیده، ۱× دوغ» */
  items: string;
  footNote?: string;
  /** Total, Persian digits (no unit). */
  total: string;
  actionLabel?: string;
  /** Primary (filled) vs secondary (outlined) action. */
  primary?: boolean;
}

export interface OrderCardProps {
  order: OrderCardData;
  onOpen?: () => void;
  onAction?: () => void;
}

/** Order card with status, items, total and an action (track / reorder). */
export function OrderCard({ order: o, onOpen, onAction }: OrderCardProps) {
  const onKey = (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onOpen?.();
    }
  };
  return (
    <div
      className={s.oc}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKey}
      aria-label={`سفارش ${o.no} از ${o.name}`}
    >
      <div className={s.hd}>
        <span className={s.lg}>
          <Art src={o.art} className={s.art} />
        </span>
        <div className={s.nm}>
          <b>{o.name}</b>
          <small>
            کد سفارش {o.no} · {o.date}
          </small>
        </div>
        <Badge text={o.statusLabel} tone={o.statusTone ?? 'ink'} />
      </div>
      <p className={s.it}>{o.items}</p>
      <div className={s.ft}>
        <span>{o.footNote}</span>
        <b>{o.total} تومان</b>
      </div>
      {o.actionLabel ? (
        <button
          type="button"
          className={[s.ac, o.primary ? s.pri : s.sec].join(' ')}
          onClick={(e) => {
            e.stopPropagation();
            onAction?.();
          }}
        >
          {o.actionLabel}
        </button>
      ) : null}
    </div>
  );
}
