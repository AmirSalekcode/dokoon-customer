import { Sheet, SheetHandle } from '../base/Sheet';
import { Icon } from '../primitives/Icon';
import { SelectCard } from './SelectCard';
import s from './ChoiceSheet.module.css';

export interface ChoiceOption {
  id: string;
  title: string;
  sub?: string;
  icon?: string;
  selected?: boolean;
  onPick?: () => void;
  /** Shows a delete button (address list). */
  onDelete?: () => void;
}

export interface ChoiceSheetProps {
  title: string;
  options: ChoiceOption[];
  addLabel?: string;
  onClose: () => void;
  onAdd?: () => void;
}

/** Bottom sheet to pick one item from a list (address, city…) with optional "add new". */
export function ChoiceSheet({ title, options, addLabel, onClose, onAdd }: ChoiceSheetProps) {
  return (
    <Sheet label={title} onClose={onClose}>
      <SheetHandle />
      <div className={s.hd}>
        <h2>{title}</h2>
        <div className={s.acts}>
          {onAdd ? (
            <button type="button" className={s.p} aria-label={addLabel} onClick={onAdd}>
              <Icon name="plus" />
            </button>
          ) : null}
          <button type="button" className={s.x} aria-label="بستن" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
      </div>
      <div className={s.ls} role="radiogroup" aria-label={title}>
        {options.map((o) => (
          <div key={o.id} className={s.row}>
            <SelectCard
              title={o.title}
              sub={o.sub}
              icon={o.icon}
              selected={o.selected}
              radio
              onPick={o.onPick}
            />
            {o.onDelete ? (
              <button type="button" className={s.del} aria-label={`حذف ${o.title}`} onClick={o.onDelete}>
                <Icon name="trash" />
              </button>
            ) : null}
          </div>
        ))}
        {onAdd && addLabel ? (
          <button type="button" className={s.ad} onClick={onAdd}>
            <Icon name="plus" />
            {addLabel}
          </button>
        ) : null}
      </div>
    </Sheet>
  );
}
