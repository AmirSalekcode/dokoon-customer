import { useState, type ComponentType } from 'react';
import { ConfirmDialog, type ConfirmDialogProps } from '@/components/library/ConfirmDialog';
import { ReasonSheet } from '@/components/library/ReasonSheet';
import { useCourierNav, type CourierOverlay } from '../nav/nav';

/** What the opener passes for `dlg`: a ConfirmDialog without `onCancel` (cancel = close the overlay). */
export type DlgSpec = Omit<ConfirmDialogProps, 'onCancel'>;

/** What the opener passes for `sheet`: fixed reasons, the confirm gets the picked one. */
export interface SheetSpec {
  title: string;
  text: string;
  reasons: { id: string; label: string }[];
  confirmLabel: string;
  onConfirm: (reasonId: string) => void;
}

type OverlayView = ComponentType<{ props: Record<string, unknown> }>;

function DlgOverlay({ props }: { props: Record<string, unknown> }) {
  const close = useCourierNav((st) => st.closeOverlay);
  const spec = props as unknown as DlgSpec;
  return <ConfirmDialog {...spec} onCancel={close} />;
}

function SheetOverlay({ props }: { props: Record<string, unknown> }) {
  const close = useCourierNav((st) => st.closeOverlay);
  const spec = props as unknown as SheetSpec;
  const [pick, setPick] = useState<string | null>(null);
  return (
    <ReasonSheet
      title={spec.title}
      text={spec.text}
      items={spec.reasons.map((r) => ({ ...r, on: r.id === pick }))}
      confirmLabel={spec.confirmLabel}
      canConfirm={pick !== null}
      onPick={setPick}
      onConfirm={() => pick && spec.onConfirm(pick)}
      onClose={close}
    />
  );
}

/**
 * Overlay views by kind. `dlg` and `sheet` are generic; `alr` (the new-offer alert) needs live offer state,
 * so its task registers it (`registerOverlay('alr', …)`, KAN-94). Only one overlay is open at a time: the
 * nav store holds a single `overlay`, and Android/browser back closes it first.
 */
const views: Partial<Record<CourierOverlay, OverlayView>> = { dlg: DlgOverlay, sheet: SheetOverlay };

export function registerOverlay(kind: CourierOverlay, view: OverlayView | null): void {
  if (view) views[kind] = view;
  else delete views[kind];
}

/** Every opened overlay gets its own React key, so reopening the same kind starts fresh (no reason pre-picked). */
const keys = new WeakMap<object, number>();
let keySeq = 0;
const keyOf = (o: object) => {
  let k = keys.get(o);
  if (k === undefined) keys.set(o, (k = ++keySeq));
  return k;
};

export function CourierOverlayHost() {
  const overlay = useCourierNav((st) => st.overlay);
  if (!overlay) return null;
  const View = views[overlay.kind];
  return View ? <View key={keyOf(overlay)} props={overlay.props ?? {}} /> : null;
}
