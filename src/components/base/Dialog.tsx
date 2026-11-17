import { useDialogFocus } from './useDialogFocus';
import s from './base.module.css';

export interface DialogProps {
  title: string;
  text?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive action → danger color. */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Some confirmations must not close on scrim tap (cart replace). */
  dismissOnScrim?: boolean;
}

/** Confirmation dialog (overlays confirm / delconfirm / dlg). */
export function Dialog({
  title,
  text,
  confirmLabel,
  cancelLabel = 'انصراف',
  danger,
  busy,
  onConfirm,
  onCancel,
  dismissOnScrim = true,
}: DialogProps) {
  const ref = useDialogFocus<HTMLDivElement>(onCancel);
  return (
    <>
      <div
        className={`${s.scrim} ${s.raised}`}
        onClick={dismissOnScrim ? onCancel : undefined}
        data-testid="scrim"
      />
      <div
        ref={ref}
        className={s.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <h4 className={s.dlgTitle}>{title}</h4>
        {text ? <p className={s.dlgText}>{text}</p> : null}
        <button
          type="button"
          className={[s.dlgOk, danger && s.dlgDanger].filter(Boolean).join(' ')}
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </button>
        <button type="button" className={s.dlgCancel} onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </>
  );
}
