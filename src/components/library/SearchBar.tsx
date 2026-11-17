import { useId } from 'react';
import { Icon } from '../primitives/Icon';
import s from './SearchBar.module.css';

export interface SearchBarProps {
  placeholder: string;
  value?: string;
  /** Editable input (search screen) vs tap-only (home → opens search). */
  editable?: boolean;
  showFilter?: boolean;
  /** Active filter count (Persian digits); hidden when empty. */
  filterCount?: string;
  autoFocus?: boolean;
  onInput?: (v: string) => void;
  onFilter?: () => void;
  onTap?: () => void;
}

/** Search bar (editable or tap-only) with optional filter button + counter. */
export function SearchBar({
  placeholder,
  value = '',
  editable,
  showFilter,
  filterCount,
  autoFocus,
  onInput,
  onFilter,
  onTap,
}: SearchBarProps) {
  const id = useId();
  return (
    <div className={s.sr}>
      <div className={s.sb}>
        <Icon name="search" size={20} className={s.ic} />
        {editable ? (
          <>
            <label htmlFor={id} className="visually-hidden">
              {placeholder}
            </label>
            <input
              id={id}
              type="search"
              enterKeyHint="search"
              placeholder={placeholder}
              value={value}
              autoFocus={autoFocus}
              onChange={(e) => onInput?.(e.target.value)}
            />
          </>
        ) : (
          <button type="button" className={s.ro} onClick={onTap}>
            {placeholder}
          </button>
        )}
      </div>
      {showFilter ? (
        <button
          type="button"
          className={s.fb}
          aria-label={filterCount ? `فیلتر و مرتب‌سازی، ${filterCount} فیلتر فعال` : 'فیلتر و مرتب‌سازی'}
          onClick={onFilter}
        >
          <Icon name="filter" />
          {filterCount ? <span className={s.cn}>{filterCount}</span> : null}
        </button>
      ) : null}
    </div>
  );
}
