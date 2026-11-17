import { Sheet, SheetHandle } from '../base/Sheet';
import { FilterChip } from './FilterChip';
import s from './FilterSheet.module.css';

export interface FilterChipItem {
  id: string;
  label: string;
  art?: string;
  selected?: boolean;
  onPick?: () => void;
}

export interface FilterToggleItem {
  id: string;
  title: string;
  sub?: string;
  on?: boolean;
  onFlip?: () => void;
}

export interface FilterSheetProps {
  sort: FilterChipItem[];
  toggles: FilterToggleItem[];
  tags: FilterChipItem[];
  ratings: FilterChipItem[];
  /** e.g. «نمایش ۱۲ رستوران» */
  countText: string;
  onClear?: () => void;
  onApply?: () => void;
  onClose: () => void;
}

/** Shared filter sheet (home + restaurants): sort, toggles, food type, min rating. */
export function FilterSheet({
  sort,
  toggles,
  tags,
  ratings,
  countText,
  onClear,
  onApply,
  onClose,
}: FilterSheetProps) {
  return (
    <Sheet label="فیلتر و مرتب‌سازی" onClose={onClose} height="tall">
      <div className={s.hd}>
        <SheetHandle />
        <div className={s.hr}>
          <h2>فیلتر و مرتب‌سازی</h2>
          <button type="button" className={s.cl} onClick={onClear}>
            حذف همه
          </button>
        </div>
      </div>
      <div className={s.bd}>
        <h3 className={s.h}>مرتب‌سازی</h3>
        <div className={s.wr} role="radiogroup" aria-label="مرتب‌سازی">
          {sort.map((c) => (
            <FilterChip key={c.id} label={c.label} selected={c.selected} onPick={c.onPick} />
          ))}
        </div>
        <h3 className={s.h}>فقط نشان بده</h3>
        <div className={s.box}>
          {toggles.map((t) => (
            <button
              key={t.id}
              type="button"
              className={[s.row, t.on && s.on].filter(Boolean).join(' ')}
              role="switch"
              aria-checked={!!t.on}
              onClick={t.onFlip}
            >
              <span>
                <b>{t.title}</b>
                {t.sub ? <small>{t.sub}</small> : null}
              </span>
              <span className={s.sw} />
            </button>
          ))}
        </div>
        <h3 className={s.h}>نوع غذا</h3>
        <div className={s.wr}>
          {tags.map((c) => (
            <FilterChip key={c.id} label={c.label} art={c.art} selected={c.selected} onPick={c.onPick} />
          ))}
        </div>
        <h3 className={s.h}>حداقل امتیاز</h3>
        <div className={s.wr}>
          {ratings.map((c) => (
            <FilterChip key={c.id} label={c.label} selected={c.selected} onPick={c.onPick} />
          ))}
        </div>
      </div>
      <div className={s.ft}>
        <button type="button" className={s.ap} onClick={onApply}>
          {countText}
        </button>
      </div>
    </Sheet>
  );
}
