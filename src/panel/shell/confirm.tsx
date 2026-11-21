import { useState } from 'react';
import { ConfirmDialog } from '@/components/library/ConfirmDialog';
import { usePanelNav } from '../nav/nav';

export interface ConfirmSpec {
  title: string;
  text?: string;
  confirmLabel: string;
  tone?: 'danger' | 'ok';
  /** Runs with the dialog busy; resolve true to run `after` once the dialog is closed. */
  onConfirm: () => Promise<boolean> | boolean;
  after?: () => void;
}

/** Ask before a destructive step (delete dish / group …) through the single overlay slot. */
export const askConfirm = (spec: ConfirmSpec) =>
  usePanelNav.getState().openOverlay({ kind: 'confirm', props: { action: 'custom', spec } });

export function CustomConfirm({ spec }: { spec: ConfirmSpec }) {
  const [busy, setBusy] = useState(false);
  const close = usePanelNav((st) => st.closeOverlay);
  return (
    <ConfirmDialog
      title={spec.title}
      text={spec.text}
      confirmLabel={spec.confirmLabel}
      tone={spec.tone ?? 'danger'}
      busy={busy}
      onConfirm={async () => {
        if (busy) return;
        setBusy(true);
        const ok = await spec.onConfirm();
        setBusy(false);
        if (usePanelNav.getState().overlay?.kind === 'confirm') close();
        if (ok) spec.after?.();
      }}
      onCancel={close}
    />
  );
}
