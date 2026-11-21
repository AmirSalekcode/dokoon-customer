import type { ReactNode } from 'react';
import { Sheet, SheetHandle } from '@/components/base/Sheet';
import { SheetConfirm, SheetHead, sheetBody, sheetText } from './SheetParts';
import s from './ReasonSheet.module.css';

export interface ReasonSheetProps {
  title: string;
  text: string;
  items: { id: string; label: string; on: boolean }[];
  confirmLabel: string;
  canConfirm: boolean;
  busy?: boolean;
  /** Loading / error content instead of the list. */
  status?: ReactNode;
  onPick: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Pick one reason, then a red confirm (restaurant: reject/cancel an order; courier: withdraw from an order,
 * report a problem). Reasons are a radiogroup; all texts come from props.
 */
export function ReasonSheet(p: ReasonSheetProps) {
  return (
    <Sheet label={p.title} onClose={p.onClose}>
      <SheetHandle />
      <SheetHead title={p.title} onClose={p.onClose} />
      <div className={sheetBody}>
        <p className={sheetText}>{p.text}</p>
        {p.status ?? (
          <div className={s.reasons} role="radiogroup" aria-label={p.title}>
            {p.items.map((x) => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={x.on}
                className={[s.reason, x.on && s.on].filter(Boolean).join(' ')}
                onClick={() => p.onPick(x.id)}
              >
                <span className={s.mark} aria-hidden="true" />
                {x.label}
              </button>
            ))}
          </div>
        )}
        <SheetConfirm
          label={p.confirmLabel}
          disabled={!p.canConfirm}
          busy={p.busy}
          className={s.danger}
          onClick={p.onConfirm}
        />
      </div>
    </Sheet>
  );
}
