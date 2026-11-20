import { create } from 'zustand';
import { toast } from '@/ui/toast';
import type { Order } from '../api/types';
import { usePanelNav } from '../nav/nav';
import { onLiveEvent } from '../realtime/live';
import { soundEngine } from '../sound/engine';
import { useOrders } from '../state/orders';
import { TOAST_MS } from './actions';
import { orderNo } from './present';

/**
 * New-order alert (KAN-64): every new order that reaches this device during the shift (live
 * `order.created`, or one found by a re-sync after a missed event) joins a queue; the first one is the
 * full-screen alert, rings until it is answered, and the next follows. Orders that were already waiting
 * when the shift started are only in the list (their card pulses), not alerts.
 * Answered on another device (D-96) → the alert closes with a toast; `order.expired` → toast.
 */
interface AlertsState {
  /** Order ids in arrival order; the head is on screen. */
  queue: string[];
  /** «قطع صدا» for the current alert (the timer keeps running). */
  muted: boolean;
}
export const useAlerts = create<AlertsState>(() => ({ queue: [], muted: false }));

export const ANSWERED_ELSEWHERE = 'این سفارش در دستگاه دیگری پاسخ داده شد';

/** Orders this device is answering (no «answered elsewhere» toast for our own accept/reject). */
const answeredHere = new Set<string>();
export const markAnsweredHere = (id: string) => answeredHere.add(id);

/** The order on the alert screen, or null. */
export function currentAlert(): Order | null {
  const id = useAlerts.getState().queue[0];
  return (id && useOrders.getState().byId[id]) || null;
}

export function muteAlert() {
  soundEngine().mute();
  useAlerts.setState({ muted: true });
}

/** Alert overlays: the alert itself and the sheets opened from it. */
const isAlertOverlay = (kind: string | undefined) => kind === 'alert';

function syncOverlay() {
  const nav = usePanelNav.getState();
  const head = currentAlert();
  const ov = nav.overlay;
  if (head && !ov) nav.openOverlay({ kind: 'alert' });
  else if (!head && isAlertOverlay(ov?.kind)) nav.closeOverlay();
}

let ringingFor: string | null = null;
function syncSound() {
  const head = useAlerts.getState().queue[0] ?? null;
  if (head === ringingFor) return;
  ringingFor = head;
  const engine = soundEngine();
  engine.stopAlert();
  useAlerts.setState({ muted: false });
  if (head) engine.startAlert();
}

/** Start watching orders for alerts (shift start); returns the stop function. */
export function startAlerts(): () => void {
  /** New orders this device has seen (alerted or present at shift start). */
  let seen: Set<string> | null = null;
  /** Order numbers of queued alerts, for toasts after the order left the store. */
  const numbers = new Map<string, string>();

  const onOrders = () => {
    const { byId, status } = useOrders.getState();
    if (status !== 'ready' && seen === null) return;
    const news = Object.values(byId).filter((o) => o.status === 'new' && o.id);
    if (seen === null) {
      // First list of the shift: waiting orders are in the list, not alerts.
      seen = new Set(news.map((o) => o.id!));
    }
    let queue = useAlerts.getState().queue.filter((id) => byId[id]?.status === 'new');
    const fresh = news
      .filter((o) => !seen!.has(o.id!))
      .sort((a, b) => Date.parse(a.placedAt ?? '') - Date.parse(b.placedAt ?? ''));
    for (const o of fresh) {
      seen.add(o.id!);
      numbers.set(o.id!, orderNo(o));
      queue = [...queue, o.id!];
    }
    const prev = useAlerts.getState().queue;
    if (queue.length !== prev.length || queue.some((id, i) => id !== prev[i])) useAlerts.setState({ queue });
    syncSound();
    syncOverlay();
  };

  // One toast per alerted order when it leaves «new» without this device answering it.
  const offLive = onLiveEvent((m) => {
    // A live new order is always an alert, even before the first list of the shift arrived.
    if (m.event === 'order.created' && m.data.id && m.data.status === 'new') {
      const nid = m.data.id;
      seen?.add(nid);
      numbers.set(nid, orderNo(m.data));
      const q = useAlerts.getState().queue;
      if (!q.includes(nid)) useAlerts.setState({ queue: [...q, nid] });
      syncSound();
      syncOverlay();
      return;
    }
    const id = m.event === 'order.updated' ? m.data.id : 'orderId' in m.data ? m.data.orderId : undefined;
    if (!id || !numbers.has(id)) return;
    if (m.event === 'order.updated' && m.data.status === 'new') return;
    const no = numbers.get(id)!;
    numbers.delete(id);
    if (answeredHere.has(id)) return;
    if (m.event === 'order.expired') toast(`سفارش ${no} بی‌پاسخ ماند و لغو شد`, 'warn', TOAST_MS);
    else if (m.event === 'order.cancelled') toast(`سفارش ${no} لغو شد`, 'warn', TOAST_MS);
    else if (m.event === 'order.updated') toast(ANSWERED_ELSEWHERE, 'info', TOAST_MS);
  });

  const offOrders = useOrders.subscribe(onOrders);
  const offNav = usePanelNav.subscribe((st, old) => {
    if (st.overlay !== old.overlay) syncOverlay();
  });
  onOrders();

  return () => {
    offOrders();
    offNav();
    offLive();
    ringingFor = null;
    soundEngine().stopAlert();
    useAlerts.setState({ queue: [], muted: false });
    answeredHere.clear();
    if (isAlertOverlay(usePanelNav.getState().overlay?.kind)) usePanelNav.getState().closeOverlay();
  };
}
