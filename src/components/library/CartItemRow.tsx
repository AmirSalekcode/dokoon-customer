import { Art } from '../primitives/Art';
import { Price } from './Price';
import { QuantityStepper } from './QuantityStepper';
import s from './CartItemRow.module.css';

export interface CartItemRowItem {
  name: string;
  art?: string;
  /** e.g. «سیب‌زمینی متوسط، پنیر اضافه» */
  optionsText?: string;
  /** Line total, integer toman. */
  total: number;
  /** Server says this food is no longer available. */
  unavailable?: boolean;
}

export interface CartItemRowProps {
  item: CartItemRowItem;
  qtyText: string;
  onInc?: () => void;
  onDec?: () => void;
}

/** Cart line: name, options, price, quantity stepper. */
export function CartItemRow({ item, qtyText, onInc, onDec }: CartItemRowProps) {
  return (
    <div className={[s.ci, item.unavailable && s.off].filter(Boolean).join(' ')}>
      <div className={s.th}>
        <Art src={item.art} className={s.art} />
      </div>
      <div className={s.bd}>
        <h4 className={s.nm}>{item.name}</h4>
        {item.unavailable ? <span className={s.na}>ناموجود</span> : null}
        {item.optionsText ? <p className={s.op}>{item.optionsText}</p> : null}
        <div className={s.bt}>
          <Price price={item.total} />
          <QuantityStepper value={qtyText} onInc={onInc} onDec={onDec} itemName={item.name} />
        </div>
      </div>
    </div>
  );
}
