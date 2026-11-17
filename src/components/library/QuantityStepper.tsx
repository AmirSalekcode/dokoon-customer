import { Icon } from '../primitives/Icon';
import s from './QuantityStepper.module.css';

export interface QuantityStepperProps {
  /** Pre-formatted (Persian digits). */
  value: string;
  onInc?: () => void;
  onDec?: () => void;
  /** For screen readers: «افزودن یک عدد کوبیده». */
  itemName?: string;
  incDisabled?: boolean;
}

/** − / + stepper (+ is on the right, i.e. first in RTL, as in the prototype). */
export function QuantityStepper({ value, onInc, onDec, itemName, incDisabled }: QuantityStepperProps) {
  const suffix = itemName ? ` ${itemName}` : '';
  return (
    <div className={s.qs}>
      <button
        type="button"
        className={s.qb}
        aria-label={`افزودن یک عدد${suffix}`}
        disabled={incDisabled}
        onClick={(e) => {
          e.stopPropagation();
          onInc?.();
        }}
      >
        <Icon name="plus" />
      </button>
      <b className={s.qv} aria-live="polite">
        {value}
      </b>
      <button
        type="button"
        className={s.qb}
        aria-label={`کم کردن یک عدد${suffix}`}
        onClick={(e) => {
          e.stopPropagation();
          onDec?.();
        }}
      >
        <Icon name="minus" />
      </button>
    </div>
  );
}
