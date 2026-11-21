import { App as CapApp } from '@capacitor/app';
import { isNative } from '@/lib/platform';
import { DokoonNative, type DokoonNativePlugin } from '@/lib/native';
import { orderNo } from '../orders/present';
import { onLiveEvent } from '../realtime/live';
import type { RealtimeMessage } from '../realtime/events';

/**
 * Local new-order notification (KAN-72, D-98): while the restaurant app is in the background and the live
 * socket is still connected, every new order also posts a notification on the «سفارش جدید» channel (our
 * alert sound, vibration). Tapping it opens that order (deep link). It is withdrawn when the order is
 * answered / cancelled / expired, and all of them when the app comes back (the full-screen alert takes
 * over). Real push while the app is closed waits for D-50.
 */
export const NOTIFY_TITLE = 'سفارش جدید در دکون';
export const notifyBody = (no: string) => `سفارش ${no} منتظر پاسخ شماست؛ برای پذیرش یا رد بزنید.`;

export interface NotifierDeps {
  plugin: Pick<DokoonNativePlugin, 'notifyOrder' | 'cancelOrder' | 'requestNotifications'>;
  /** Subscribe to app foreground/background; returns the unsubscribe function. */
  onAppState: (fn: (active: boolean) => void) => () => void;
  onLive: (fn: (m: RealtimeMessage) => void) => () => void;
}

export function startOrderNotifier(deps: NotifierDeps): () => void {
  let active = true;
  const shown = new Set<string>();
  const cancel = (id: string) => {
    if (!shown.delete(id)) return;
    void deps.plugin.cancelOrder({ id }).catch(() => {});
  };

  // Android 13+: ask once at shift start (the app works without it: sound + alert in the foreground).
  void deps.plugin.requestNotifications().catch(() => {});

  const offState = deps.onAppState((isActive) => {
    active = isActive;
    if (isActive) for (const id of [...shown]) cancel(id);
  });
  const offLive = deps.onLive((m) => {
    if (m.event === 'order.created' && m.data.id && m.data.status === 'new') {
      if (active || shown.has(m.data.id)) return;
      const id = m.data.id;
      shown.add(id);
      void deps.plugin
        .notifyOrder({ id, title: NOTIFY_TITLE, body: notifyBody(orderNo(m.data)) })
        .catch(() => shown.delete(id));
      return;
    }
    if (m.event === 'order.updated' && m.data.id && m.data.status !== 'new') cancel(m.data.id);
    else if (m.event === 'order.cancelled' || m.event === 'order.expired') cancel(m.data.orderId);
  });
  return () => {
    offState();
    offLive();
    for (const id of [...shown]) cancel(id);
  };
}

/** Shift start in the Android app; no-op in the browser (Web Push covers the PWA, KAN-70). */
export function startNativeOrderNotifications(): () => void {
  if (!isNative()) return () => {};
  return startOrderNotifier({
    plugin: DokoonNative,
    onAppState: (fn) => {
      const sub = CapApp.addListener('appStateChange', ({ isActive }) => fn(isActive));
      return () => void sub.then((h) => h.remove());
    },
    onLive: onLiveEvent,
  });
}
