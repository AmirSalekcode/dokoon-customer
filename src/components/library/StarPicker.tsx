import s from './StarPicker.module.css';

export interface StarItem {
  /** e.g. «۳ ستاره» */
  label: string;
  on?: boolean;
  onPick?: () => void;
}

export interface StarPickerProps {
  items: StarItem[];
  /** Text under the stars, e.g. «خوب بود». */
  label?: string;
  /** Accessible group name. */
  name?: string;
}

const STAR = 'M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.7 19.8l1.1-6.1L3.3 9.4l6.1-.8z';

/** Star rating input (LTR order 1→5, as in the prototype). */
export function StarPicker({ items, label, name = 'امتیاز' }: StarPickerProps) {
  return (
    <div className={s.w}>
      <div className={s.st} role="radiogroup" aria-label={name}>
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            role="radio"
            aria-checked={!!it.on}
            className={[s.s, it.on && s.on].filter(Boolean).join(' ')}
            aria-label={it.label}
            onClick={it.onPick}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={STAR} />
            </svg>
          </button>
        ))}
      </div>
      <div className={s.lb} aria-live="polite">
        {label}
      </div>
    </div>
  );
}
