import { create } from 'zustand';
import { apiBaseUrl } from '@/lib/apiBase';
import { createLiveClient, type LiveClient, type LiveStatus } from '@/lib/liveClient';
import { useActiveOrder } from '../state/active';
import { useOffers } from '../state/offers';
import { useOnline } from '../state/online';
import { parseCourierFrame, type CourierRealtimeMessage, type SocketFactory } from './events';

/**
 * Courier live connection (KAN-94, contract-notes 33):
 * - runs exactly while the courier is online or has an active order (the same rule as tracking);
 * - every open (first and after a reconnect) re-reads `GET /c/offers` and `GET /c/orders/active`, since
 *   events may have been missed;
 * - connection lost → reconnect with backoff and, meanwhile, re-read the offers every 10 s, so offers
 *   still arrive, only later. The page says so in one line; the full offline page is only for a lost
 *   network (the shell watches that);
 * - events update the offers / active-order stores and reach listeners (the offer alert, KAN-95).
 */
export const LIVE_TIMING = {
  /** A blip shorter than this is not shown. */
  graceMs: 2500,
  /** Offers refresh while disconnected. */
  pollMs: 10_000,
  /** Expired offers leave the list (server deadline). */
  pruneMs: 1000,
};

interface LiveState {
  status: LiveStatus;
  /** Down for longer than the grace period (the page shows the fallback line). */
  degraded: boolean;
}
export const useCourierLive = create<LiveState>(() => ({ status: 'idle', degraded: false }));

let socketFactory: SocketFactory = (url) => new WebSocket(url);
/** Mock/demo builds pass the in-page mock stream. */
export function setCourierSocketFactory(f: SocketFactory) {
  socketFactory = f;
}

/** `https://api…/v1` → `wss://api…/v1/c/stream`. */
export const courierStreamUrl = (base = apiBaseUrl()) => `${base.replace(/^http/, 'ws')}/c/stream`;

type Listener = (msg: CourierRealtimeMessage) => void;
const listeners = new Set<Listener>();
export function onCourierEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let client: LiveClient | null = null;
let graceTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pruneTimer: ReturnType<typeof setInterval> | null = null;

function clearDown() {
  if (graceTimer) clearTimeout(graceTimer);
  if (pollTimer) clearInterval(pollTimer);
  graceTimer = null;
  pollTimer = null;
}

const resync = () => {
  void useOffers.getState().load({ silent: true });
  void useActiveOrder.getState().load();
};

function onStatus(status: LiveStatus) {
  useCourierLive.setState({ status });
  if (status === 'down') {
    if (graceTimer || pollTimer) return;
    graceTimer = setTimeout(() => {
      graceTimer = null;
      useCourierLive.setState({ degraded: true });
    }, LIVE_TIMING.graceMs);
    pollTimer = setInterval(resync, LIVE_TIMING.pollMs);
  } else {
    clearDown();
    useCourierLive.setState({ degraded: false });
    if (status === 'open') resync();
  }
}

function dispatch(msg: CourierRealtimeMessage) {
  const { online, hasActive } = useOnline.getState();
  // Offers only reach a courier who is online and free.
  if (msg.event !== 'offer.created' || (online && !hasActive)) useOffers.getState().apply(msg);
  useActiveOrder.getState().apply(msg);
  for (const fn of listeners) {
    try {
      fn(msg);
    } catch (e) {
      console.error('[courier live] listener failed', e);
    }
  }
}

/**
 * The web socket is authenticated by the session cookie (no ticket). The Android app needs the one-time
 * ticket of contract-notes 33 (`POST /c/stream/ticket`), which is not in the contract yet.
 */
const getTicket = () => Promise.resolve('');

function start() {
  client ??= createLiveClient({
    getTicket,
    socket: (url) => socketFactory(url),
    url: courierStreamUrl(),
    parse: parseCourierFrame,
    onMessage: dispatch,
    onStatus,
  });
  client.start();
  pruneTimer ??= setInterval(() => useOffers.getState().prune(), LIVE_TIMING.pruneMs);
}

export function stopCourierLive() {
  client?.stop();
  client = null;
  clearDown();
  if (pruneTimer) clearInterval(pruneTimer);
  pruneTimer = null;
  useCourierLive.setState({ status: 'idle', degraded: false });
}

/** «تلاش دوباره» / back online: skip the remaining backoff. */
export function reconnectCourierLive() {
  client?.reconnectNow();
}

/**
 * Follow the online store: connect while online or on an order; going offline closes the socket and
 * empties the offers. Called once by the shell; returns the unsubscribe.
 */
export function initCourierLive(): () => void {
  const sync = (s: { online: boolean; hasActive: boolean }, prev?: { online: boolean; hasActive: boolean }) => {
    const want = s.online || s.hasActive;
    if (want) start();
    else stopCourierLive();
    if (!s.online || s.hasActive) useOffers.getState().clear();
    else if (!prev?.online || prev.hasActive) void useOffers.getState().load();
  };
  sync(useOnline.getState());
  const unsub = useOnline.subscribe((s, prev) => {
    if (s.online !== prev.online || s.hasActive !== prev.hasActive) sync(s, prev);
  });
  const onOnline = () => reconnectCourierLive();
  window.addEventListener('online', onOnline);
  return () => {
    unsub();
    window.removeEventListener('online', onOnline);
    stopCourierLive();
  };
}
