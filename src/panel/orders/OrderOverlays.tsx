import { useEffect, useState } from 'react';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { toFaDigits } from '@/lib/format';
import type { RejectReason } from '../api/types';
import { NewOrderAlert } from '../components/NewOrderAlert';
import { ReasonSheet } from '@/components/library/ReasonSheet';
import { PrepSheet } from '../components/OrderSheets';
import { usePanelNav } from '../nav/nav';
import { useOrders } from '../state/orders';
import { runOrderAction } from './actions';
import { markAnsweredHere, muteAlert, useAlerts } from './alerts';
import { useNow } from './hooks';
import { clockText, orderNo, payLabel, secondsLeft, totalText } from './present';
import { loadRejectReasons } from './reasons';

/** Prep-time choices (screen specs) + «دلخواه» with a ±5 stepper in 5..120. */
export const PREP_CHOICES = [15, 20, 30, 40] as const;
export const PREP_MIN = 5;
export const PREP_MAX = 120;
const CUSTOM_START = 45;
/** Server default when an order has no deadline window (`acceptTimeoutSec`). */
const DEFAULT_TIMEOUT_SEC = 180;

/** Text the restaurant sees for the customer's estimate (D-93: the server adds the courier's route). */
export const prepPreview = (min: number | null) =>
  min ? `مشتری: آماده‌سازی ${toFaDigits(min)} دقیقه + زمان مسیر پیک` : 'یک زمان انتخاب کنید';

export function AlertOverlay() {
  const id = useAlerts((st) => st.queue[0]);
  const waiting = useAlerts((st) => st.queue.length - 1);
  const muted = useAlerts((st) => st.muted);
  const order = useOrders((st) => (id ? st.byId[id] : undefined));
  const openOverlay = usePanelNav((st) => st.openOverlay);
  const now = useNow(1000);
  if (!order?.id) return null;
  const left = secondsLeft(order, now);
  const span =
    (Date.parse(order.acceptDeadline ?? '') - Date.parse(order.placedAt ?? '')) / 1000 || DEFAULT_TIMEOUT_SEC;
  return (
    <NewOrderAlert
      order={{
        no: orderNo(order),
        items: (order.items ?? []).map((i) => ({
          q: `${toFaDigits(i.qty ?? 1)}×`,
          name: i.name ?? '',
          opt: i.optionsText || undefined,
        })),
        note: order.note || undefined,
        pay: order.payment === 'cash' ? 'cash' : 'online',
        payLabel: payLabel(order),
        total: totalText(order),
      }}
      timerText={clockText(left)}
      progress={span > 0 ? left / span : 0}
      muted={muted}
      queueText={waiting > 0 ? `${toFaDigits(waiting)} سفارش جدید دیگر در صف` : ''}
      onMute={muteAlert}
      onAccept={() => openOverlay({ kind: 'prep', props: { id: order.id } }, { keepParent: true })}
      onReject={() => openOverlay({ kind: 'reason', props: { id: order.id } }, { keepParent: true })}
    />
  );
}

/** Close the prep/reason sheet of this order (only if it is still the open overlay). */
function closeSheet(id: string) {
  const nav = usePanelNav.getState();
  const ov = nav.overlay;
  if ((ov?.kind === 'prep' || ov?.kind === 'reason') && ov.props?.id === id) nav.closeOverlay();
}

/** Closes a sheet whose order moved on (answered elsewhere, expired, cancelled). */
function useCloseWhenGone(id: string, statuses: string[]) {
  const status = useOrders((st) => st.byId[id]?.status);
  const busy = useOrders((st) => !!st.busy[id]);
  useEffect(() => {
    if (!busy && (!status || !statuses.includes(status))) closeSheet(id);
  }, [status, busy]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function PrepOverlay({ id }: { id: string }) {
  const [pick, setPick] = useState<string | null>(null);
  const [custom, setCustom] = useState(CUSTOM_START);
  const busy = useOrders((st) => !!st.busy[id]);
  const closeOverlay = usePanelNav((st) => st.closeOverlay);
  useCloseWhenGone(id, ['new']);
  const minutes = pick === 'custom' ? custom : pick ? Number(pick) : null;

  const confirm = async () => {
    if (!minutes) return;
    markAnsweredHere(id);
    const r = await runOrderAction(id, 'accept', { prepMinutes: minutes });
    if (r !== 'error') closeSheet(id);
  };

  return (
    <PrepSheet
      opts={[
        ...PREP_CHOICES.map((m) => ({
          key: String(m),
          big: toFaDigits(m),
          small: 'دقیقه',
          on: pick === String(m),
        })),
        { key: 'custom', big: 'دلخواه', small: 'زمان دیگر', on: pick === 'custom' },
      ]}
      custom={pick === 'custom'}
      customVal={`${toFaDigits(custom)} دقیقه`}
      canDec={custom > PREP_MIN}
      canInc={custom < PREP_MAX}
      preview={prepPreview(minutes)}
      canConfirm={!!minutes}
      busy={busy}
      onPick={setPick}
      onStep={(d) => setCustom((c) => Math.max(PREP_MIN, Math.min(PREP_MAX, c + d)))}
      onConfirm={() => void confirm()}
      onClose={closeOverlay}
    />
  );
}

export function ReasonOverlay({ id }: { id: string }) {
  const order = useOrders((st) => st.byId[id]);
  const busy = useOrders((st) => !!st.busy[id]);
  const closeOverlay = usePanelNav((st) => st.closeOverlay);
  const [reasons, setReasons] = useState<Required<RejectReason>[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  // Prep orders are cancelled (secondary action of the detail, KAN-65); new ones rejected.
  const [cancel] = useState(order?.status === 'prep');
  useCloseWhenGone(id, cancel ? ['prep'] : ['new']);

  const load = () => {
    setFailed(false);
    loadRejectReasons().then(setReasons, () => setFailed(true));
  };
  useEffect(() => {
    loadRejectReasons().then(setReasons, () => setFailed(true));
  }, []);

  const confirm = async () => {
    if (!pick) return;
    markAnsweredHere(id);
    const r = await runOrderAction(id, 'reject', { reasonId: pick });
    if (r !== 'error') closeSheet(id);
  };

  return (
    <ReasonSheet
      title={cancel ? 'دلیل لغو سفارش' : 'دلیل رد سفارش'}
      text={
        order?.payment === 'cash'
          ? 'دلیل برای مشتری ارسال می‌شود.'
          : 'دلیل برای مشتری ارسال می‌شود و مبلغ آنلاین خودکار به او برمی‌گردد.'
      }
      items={(reasons ?? []).map((r) => ({ id: r.id, label: r.label, on: pick === r.id }))}
      status={
        failed ? (
          <ErrorState title="دلیل‌ها نیامد" onRetry={load} />
        ) : !reasons ? (
          <LoadingState variant="list" rows={3} />
        ) : undefined
      }
      confirmLabel={cancel ? 'لغو سفارش' : 'رد سفارش'}
      canConfirm={!!pick}
      busy={busy}
      onPick={setPick}
      onConfirm={() => void confirm()}
      onClose={closeOverlay}
    />
  );
}
