import { Icon } from '@/components/primitives/Icon';
import type { OrderTone } from '../orders/present';
import s from './OrderTile.module.css';

export interface OrderTileView {
  /** «#۱۲۴۸» */
  no: string;
  name: string;
  itemsText: string;
  total: string;
  statusLabel: string;
  tone: OrderTone;
  timeText: string;
  pay: 'online' | 'cash';
  payLabel: string;
  /** Deadline / prep time / courier / reason line; '' = none. */
  extraText?: string;
}

export interface OrderTileProps {
  order: OrderTileView;
  /** Main action of the step; '' = none (way, history). */
  actionLabel?: string;
  actionTone?: 'new' | 'ok' | 'dark';
  /** Selected in the tablet list/detail split. */
  selected?: boolean;
  /** Action in flight: spinner, no second tap. */
  busy?: boolean;
  onOpen?: () => void;
  onAction?: () => void;
}

/** Order card in the orders list (restaurant component library). Data-driven: the parent formats. */
export function OrderTile({
  order: o,
  actionLabel,
  actionTone = 'new',
  selected,
  busy,
  onOpen,
  onAction,
}: OrderTileProps) {
  return (
    <article
      className={[s.tile, o.tone === 'new' && s.fresh, selected && s.sel].filter(Boolean).join(' ')}
      data-testid="order-tile"
    >
      <button
        type="button"
        className={s.open}
        onClick={onOpen}
        aria-label={`جزئیات سفارش ${o.no}، ${o.statusLabel}، ${o.name}`}
        aria-current={selected ? 'true' : undefined}
      >
        <span className={s.head}>
          <b className={s.no}>{o.no}</b>
          <span className={[s.badge, s[`t_${o.tone}`]].join(' ')}>{o.statusLabel}</span>
          <span className={s.time}>{o.timeText}</span>
        </span>
        <span className={s.who}>
          <span className={s.name}>{o.name}</span>
          <span className={s.items}>{o.itemsText}</span>
        </span>
        <span className={s.meta}>
          <span className={[s.pay, o.pay === 'cash' && s.cash].filter(Boolean).join(' ')}>{o.payLabel}</span>
          <span className={s.total}>{o.total}</span>
        </span>
        {o.extraText ? (
          <span className={s.extra}>
            <Icon name="clock" size={20} />
            <span>{o.extraText}</span>
          </span>
        ) : null}
      </button>
      {actionLabel ? (
        <button
          type="button"
          className={[s.action, s[`a_${actionTone}`]].join(' ')}
          onClick={onAction}
          disabled={busy}
          aria-busy={busy || undefined}
        >
          {busy ? <i className={s.spin} aria-hidden="true" /> : null}
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}
