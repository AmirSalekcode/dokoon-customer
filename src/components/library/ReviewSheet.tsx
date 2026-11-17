import { useId } from 'react';
import { Sheet, SheetHandle } from '../base/Sheet';
import { Icon } from '../primitives/Icon';
import { StarPicker, type StarItem } from './StarPicker';
import s from './ReviewSheet.module.css';

export interface ReviewSheetProps {
  foodName: string;
  starItems: StarItem[];
  starLabel?: string;
  text: string;
  /** Stars are required; text is optional. */
  canSubmit: boolean;
  busy?: boolean;
  onText?: (v: string) => void;
  onSubmit?: () => void;
  onClose: () => void;
}

/** Review sheet: stars (required) + optional text (max 500, per contract). */
export function ReviewSheet({
  foodName,
  starItems,
  starLabel,
  text,
  canSubmit,
  busy,
  onText,
  onSubmit,
  onClose,
}: ReviewSheetProps) {
  const id = useId();
  return (
    <Sheet label="ثبت نظر" onClose={onClose} raised className={s.sh}>
      <SheetHandle />
      <div className={s.hd}>
        <div>
          <h2>ثبت نظر شما</h2>
          <small>{foodName}</small>
        </div>
        <button type="button" className={s.x} aria-label="بستن" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className={s.stars}>
        <StarPicker items={starItems} label={starLabel} name={`امتیاز به ${foodName}`} />
      </div>
      <label htmlFor={id} className="visually-hidden">
        متن نظر (اختیاری)
      </label>
      <textarea
        id={id}
        className={s.nt}
        maxLength={500}
        placeholder="تجربه‌ی خود را از این غذا بنویسید (اختیاری)"
        value={text}
        onChange={(e) => onText?.(e.target.value)}
      />
      <button type="button" className={s.ok} disabled={!canSubmit || busy} onClick={onSubmit}>
        ثبت نظر
      </button>
    </Sheet>
  );
}
