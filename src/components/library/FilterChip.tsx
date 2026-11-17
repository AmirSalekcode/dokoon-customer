import { Art } from '../primitives/Art';
import s from './FilterChip.module.css';

export interface FilterChipProps {
  label: string;
  selected?: boolean;
  art?: string;
  onPick?: () => void;
}

/** Selectable chip (optional art icon). */
export function FilterChip({ label, selected, art, onPick }: FilterChipProps) {
  return (
    <button
      type="button"
      className={[s.fc, selected && s.on].filter(Boolean).join(' ')}
      aria-pressed={!!selected}
      onClick={onPick}
    >
      {art ? <Art src={art} className={s.fi} /> : null}
      {label}
    </button>
  );
}
