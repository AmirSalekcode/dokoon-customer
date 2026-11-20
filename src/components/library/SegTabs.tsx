import { useRef, type KeyboardEvent } from 'react';
import s from './SegTabs.module.css';

export interface SegTab {
  key: string;
  label: string;
  /** Pre-formatted counter (parent formats Persian digits); omitted or '' = no counter. */
  count?: string;
  /** Counter needs attention (e.g. new orders > 0): red counter. */
  hot?: boolean;
}

export interface SegTabsProps {
  /** Accessible name of the tab list. */
  label: string;
  items: SegTab[];
  active: string;
  onPick: (key: string) => void;
}

/**
 * Pill tabs with optional counters (orders by status, menu categories, report periods).
 * Roving tab index; arrow keys follow the reading direction (RTL: ArrowLeft = next).
 */
export function SegTabs({ label, items, active, onPick }: SegTabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, i: number) => {
    // The app is RTL; only an explicit dir="ltr" ancestor flips the arrows.
    const rtl = e.currentTarget.closest('[dir]')?.getAttribute('dir') !== 'ltr';
    const step: Record<string, number> = {
      ArrowLeft: rtl ? 1 : -1,
      ArrowRight: rtl ? -1 : 1,
    };
    let next: number;
    if (e.key in step) next = (i + step[e.key] + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else return;
    e.preventDefault();
    refs.current[next]?.focus();
    onPick(items[next].key);
  };

  return (
    <div className={s.wrap} role="tablist" aria-label={label}>
      {items.map((t, i) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={t.count ? `${t.label} ${t.count}` : undefined}
            tabIndex={on ? 0 : -1}
            className={[s.tab, on && s.on, t.hot && s.hot].filter(Boolean).join(' ')}
            onClick={() => onPick(t.key)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
            {t.count ? (
              <b className={s.count} aria-hidden="true">
                {t.count}
              </b>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
