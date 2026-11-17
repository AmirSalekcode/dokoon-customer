import type { ReactNode } from 'react';
import { useDialogFocus } from './useDialogFocus';
import s from './base.module.css';

export interface SheetProps {
  label: string;
  onClose: () => void;
  /** Height mode: 'auto' (content, max 70%) | 'tall' (90%) | 'full' (92%). */
  height?: 'auto' | 'tall' | 'full';
  /** Side drawer from the start edge (right in RTL) — used by MenuDrawer. */
  side?: boolean;
  /** Raise above another overlay (review over food). */
  raised?: boolean;
  className?: string;
  children: ReactNode;
}

/** Bottom sheet / side drawer with scrim. Close: scrim tap, ×, Escape, system back (via nav). */
export function Sheet({ label, onClose, height = 'auto', side, raised, className, children }: SheetProps) {
  const ref = useDialogFocus<HTMLDivElement>(onClose);
  return (
    <>
      <div
        className={[s.scrim, raised && s.raised].filter(Boolean).join(' ')}
        onClick={onClose}
        data-testid="scrim"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={[side ? s.drawer : s.sheet, !side && s[`h_${height}`], raised && s.raisedPanel, className]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </>
  );
}

/** Grab handle shown at the top of bottom sheets. */
export const SheetHandle = () => <i className={s.handle} aria-hidden="true" />;
