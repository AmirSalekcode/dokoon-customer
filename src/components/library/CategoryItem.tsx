import { Art } from '../primitives/Art';
import s from './CategoryItem.module.css';

export interface CategoryItemProps {
  title: string;
  art?: string;
  selected?: boolean;
  onPick?: () => void;
}

/** Round category tile with art and title. */
export function CategoryItem({ title, art, selected, onPick }: CategoryItemProps) {
  return (
    <button
      type="button"
      className={[s.ci, selected && s.on].filter(Boolean).join(' ')}
      aria-pressed={!!selected}
      onClick={onPick}
    >
      <span className={s.cc}>
        <Art src={art} className={s.art} />
      </span>
      <span>{title}</span>
    </button>
  );
}
