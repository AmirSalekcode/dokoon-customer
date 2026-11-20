import { Dialog } from '../base/Dialog';

export interface ConfirmDialogProps {
  title: string;
  text?: string;
  confirmLabel: string;
  /** Default «انصراف» (from the base Dialog). */
  cancelLabel?: string;
  /** danger = destructive (close restaurant, delete, log out); ok = normal primary action. */
  tone?: 'danger' | 'ok';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation dialog of the restaurant library, on the shared base Dialog (focus trap, Escape, scrim). */
export function ConfirmDialog({ tone = 'ok', ...props }: ConfirmDialogProps) {
  return <Dialog {...props} danger={tone === 'danger'} />;
}
