import { Icon } from '@/components/primitives/Icon';
import s from './SheetParts.module.css';

/** Title row of an action sheet with a 48px close button (restaurant and courier sheets). */
export function SheetHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className={s.hd}>
      <h2>{title}</h2>
      <button type="button" className={s.x} aria-label="بستن" onClick={onClose}>
        <Icon name="close" />
      </button>
    </div>
  );
}

export interface SheetConfirmProps {
  label: string;
  disabled: boolean;
  /** Shows a spinner and blocks taps while the request runs. */
  busy?: boolean;
  /**
   * Colour class from the caller (e.g. the restaurant «new» orange). Write it as `button.x` in the caller's
   * CSS so it beats the default `.ok` colours regardless of stylesheet order.
   */
  className?: string;
  onClick: () => void;
}

/** Full-width pill confirm button at the bottom of an action sheet. */
export function SheetConfirm({ label, disabled, busy, className, onClick }: SheetConfirmProps) {
  return (
    <button
      type="button"
      className={[s.ok, className].filter(Boolean).join(' ')}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={onClick}
    >
      {busy ? <i className={s.spin} aria-hidden="true" /> : null}
      {label}
    </button>
  );
}

/** Scrolling body and the muted lead paragraph of an action sheet. */
export const sheetBody = s.body;
export const sheetText = s.p;
