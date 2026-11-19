import type { KeyboardEvent } from 'react';
import { Art } from '../primitives/Art';
import { Icon } from '../primitives/Icon';
import { Badge } from './Badge';
import { Price } from './Price';
import { QuantityStepper } from './QuantityStepper';
import s from './FoodCard.module.css';

export interface FoodCardData {
  name: string;
  desc?: string;
  art?: string;
  price: number;
  oldPrice?: number | null;
  badge?: string;
  available?: boolean;
  /** false when the restaurant is closed — adding is not allowed. */
  orderable?: boolean;
  /** Has option groups → "+" opens the sheet instead of adding directly. */
  hasGroups?: boolean;
}

export interface FoodCardProps {
  f: FoodCardData;
  /** Quantity already in cart (Persian digits); empty when none. */
  qtyText?: string;
  onOpen?: () => void;
  onAdd?: () => void;
  onInc?: () => void;
  onDec?: () => void;
}

/** Menu item card: art, price/discount, add button or stepper. */
export function FoodCard({ f, qtyText = '', onOpen, onAdd, onInc, onDec }: FoodCardProps) {
  const unavailable = f.available === false;
  const orderable = f.orderable !== false;
  const hasQ = !!qtyText;
  const showAdd = !unavailable && orderable && (f.hasGroups || !hasQ);
  const onKey = (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onOpen?.();
    }
  };
  return (
    <div
      className={[s.fd, unavailable && s.off].filter(Boolean).join(' ')}
      role="button"
      tabIndex={0}
      aria-label={f.name}
      onClick={onOpen}
      onKeyDown={onKey}
    >
      <div className={s.fm}>
        <div className={s.ft}>
          {f.badge ? <Badge text={f.badge} /> : null}
          <h3 className={s.fn}>{f.name}</h3>
          {f.desc ? <p className={s.fx}>{f.desc}</p> : null}
          <Price price={f.price} old={f.oldPrice} />
          {hasQ && f.hasGroups ? (
            <div className={s.fc2}>
              <Badge text={`${qtyText} عدد در سبد`} tone="amber" />
            </div>
          ) : null}
        </div>
        <div className={s.fi}>
          <Art src={f.art} className={s.fa} />
          {showAdd ? (
            <button
              type="button"
              className={s.fb}
              aria-label={`افزودن ${f.name} به سبد`}
              onClick={(e) => {
                e.stopPropagation();
                onAdd?.();
              }}
            >
              <i>
                <Icon name="plus" />
              </i>
            </button>
          ) : null}
          {unavailable ? <span className={s.fu}>ناموجود</span> : null}
        </div>
      </div>
      {hasQ && !f.hasGroups ? (
        <div className={s.fq} onClick={(e) => e.stopPropagation()}>
          <span>در سبد شما</span>
          <QuantityStepper value={qtyText} onInc={onInc} onDec={onDec} itemName={f.name} />
        </div>
      ) : null}
    </div>
  );
}
