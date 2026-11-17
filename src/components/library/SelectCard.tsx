import { Icon } from '../primitives/Icon';
import s from './SelectCard.module.css';

export interface SelectCardProps {
  title: string;
  sub?: string;
  /** Icon path data (24×24). */
  icon?: string;
  selected?: boolean;
  /** Show radio mark (address/payment pick). */
  radio?: boolean;
  actionLabel?: string;
  disabled?: boolean;
  onPick?: () => void;
  onAction?: () => void;
}

/** Selectable card (address, payment method) with optional side action (e.g. «تغییر»). */
export function SelectCard({
  title,
  sub,
  icon,
  selected,
  radio,
  actionLabel,
  disabled,
  onPick,
  onAction,
}: SelectCardProps) {
  return (
    <div className={[s.sc, selected && s.on, disabled && s.dis].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={s.mn}
        role={radio ? 'radio' : undefined}
        aria-checked={radio ? !!selected : undefined}
        disabled={disabled}
        onClick={onPick}
      >
        {icon ? (
          <span className={s.ib}>
            <Icon d={icon} />
          </span>
        ) : null}
        <span className={s.tx}>
          <b>{title}</b>
          {sub ? <small>{sub}</small> : null}
        </span>
        {radio ? <span className={s.mk} /> : null}
      </button>
      {actionLabel ? (
        <button type="button" className={s.ac} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
