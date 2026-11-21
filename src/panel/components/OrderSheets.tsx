import { Sheet, SheetHandle } from '@/components/base/Sheet';
import { SheetConfirm, SheetHead, sheetBody, sheetText } from '@/components/library/SheetParts';
import { Icon } from '@/components/primitives/Icon';
import s from './OrderSheets.module.css';

export interface PrepOption {
  key: string;
  /** «۲۰» or «دلخواه» */
  big: string;
  small: string;
  on: boolean;
}

export interface PrepSheetProps {
  opts: PrepOption[];
  /** «دلخواه» picked: show the ±5 stepper. */
  custom: boolean;
  /** «۴۵ دقیقه» */
  customVal: string;
  canDec: boolean;
  canInc: boolean;
  /** What the customer is told (D-93). */
  preview: string;
  canConfirm: boolean;
  busy?: boolean;
  onPick: (key: string) => void;
  onStep: (delta: 5 | -5) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/** Preparation time before accepting (restaurant component library). */
export function PrepSheet(p: PrepSheetProps) {
  return (
    <Sheet label="زمان آماده‌سازی" onClose={p.onClose}>
      <SheetHandle />
      <SheetHead title="زمان آماده‌سازی سفارش" onClose={p.onClose} />
      <div className={sheetBody}>
        <p className={sheetText}>
          این زمان به مشتری نمایش داده می‌شود. هر وقت لازم شد می‌توانید زمان را افزایش دهید.
        </p>
        <div className={s.grid} role="group" aria-label="زمان آماده‌سازی">
          {p.opts.map((o) => (
            <button
              key={o.key}
              type="button"
              className={[s.opt, o.on && s.on, o.key === 'custom' && s.word].filter(Boolean).join(' ')}
              aria-pressed={o.on}
              onClick={() => p.onPick(o.key)}
            >
              <b>{o.big}</b>
              <span>{o.small}</span>
            </button>
          ))}
        </div>
        {p.custom ? (
          <div className={s.step}>
            <button
              type="button"
              aria-label="افزودن پنج دقیقه"
              disabled={!p.canInc}
              onClick={() => p.onStep(5)}
            >
              <Icon name="plus" />
            </button>
            <output aria-live="polite">{p.customVal}</output>
            <button
              type="button"
              aria-label="کم کردن پنج دقیقه"
              disabled={!p.canDec}
              onClick={() => p.onStep(-5)}
            >
              <Icon name="minus" />
            </button>
          </div>
        ) : null}
        <div className={s.preview}>
          <small>به مشتری اعلام می‌شود</small>
          <b>{p.preview}</b>
        </div>
        <SheetConfirm
          label="تأیید و پذیرش سفارش"
          disabled={!p.canConfirm}
          busy={p.busy}
          className={s.accept}
          onClick={p.onConfirm}
        />
      </div>
    </Sheet>
  );
}
