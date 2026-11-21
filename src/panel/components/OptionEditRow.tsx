import { normalizeDigits, toFaDigits } from '@/lib/format';
import { D_TRASH, Glyph } from './OptionGroupCard';
import s from './OptionGroup.module.css';

export interface OptionEditRowProps {
  optName: string;
  /** Price as typed (ASCII digits); shown with Persian digits. */
  optPrice: string;
  /** Row number for accessible names («گزینه‌ی ۲»). */
  index: number;
  onName: (v: string) => void;
  /** Receives ASCII digits only (Persian/Arabic digits normalized, other characters dropped). */
  onPrice: (v: string) => void;
  onDelete: () => void;
}

/** One option of a group being edited: name + price (empty/0 = free) + delete. */
export function OptionEditRow({ optName, optPrice, index, onName, onPrice, onDelete }: OptionEditRowProps) {
  const n = toFaDigits(index);
  return (
    <div className={s.row}>
      <input
        className={[s.in, s.name].join(' ')}
        type="text"
        aria-label={`نام گزینه‌ی ${n}`}
        placeholder="نام گزینه"
        maxLength={40}
        value={optName}
        onChange={(e) => onName(e.target.value)}
      />
      <input
        className={[s.in, s.pr].join(' ')}
        type="text"
        inputMode="numeric"
        aria-label={`قیمت گزینه‌ی ${n} (تومان)`}
        placeholder="۰ = رایگان"
        value={toFaDigits(optPrice)}
        onChange={(e) => onPrice(normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, 9))}
      />
      <button type="button" className={s.del} aria-label={`حذف گزینه‌ی ${n}`} onClick={onDelete}>
        <Glyph d={D_TRASH} />
      </button>
    </div>
  );
}
