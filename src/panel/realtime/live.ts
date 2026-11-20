import { create } from 'zustand';
import { setRetry } from '@/errors/retry';
import { apiBaseUrl } from '@/lib/apiBase';
import { panelApi } from '../api/client';
import { usePanelNav } from '../nav/nav';
import { useOrders } from '../state/orders';
import { createLiveClient, type LiveClient, type LiveStatus } from './client';
import type { RealtimeMessage, SocketFactory } from './events';

/**
 * App wiring of the live connection (KAN-62, D-98):
 * - runs while the shift is on (started by the shell, stopped on logout);
 * - connection lost → after a short grace the full-page `offline` ErrorPage, and the active order list is
 *   re-read every 15 s until the connection is back (orders still arrive, just later);
 * - back → the offline page closes by itself and the list is synced again;
 * - every event updates the orders store and is passed to listeners (new-order alert, KAN-64).
 */
export const LIVE_TIMING = {
  /** A blip shorter than this never shows the offline page. */
  graceMs: 2500,
  /** List refresh while disconnected (D-98). */
  pollMs: 15_000,
};

interface LiveState {
  status: LiveStatus;
  /** ms epoch of the last time the connection opened. */
  connectedAt: number | null;
}
export const useLive = create<LiveState>(() => ({ status: 'idle', connectedAt: null }));

let socketFactory: SocketFactory = (url) => new WebSocket(url);
/** Mock/demo builds pass the in-page mock stream (D-71: no service worker on Android). */
export function setSocketFactory(f: SocketFactory) {
  socketFactory = f;
}

/** `https://api…/v1` → `wss://api…/v1/r/stream`. */
export const streamUrl = (base = apiBaseUrl()) => `${base.replace(/^http/, 'ws')}/r/stream`;

type Listener = (msg: RealtimeMessage) => void;
const listeners = new Set<Listener>();
/** Subscribe to every realtime event; returns the unsubscribe function. */
export function onLiveEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let client: LiveClient | null = null;
let graceTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let wasDown = false;

function isOfflineTop() {
  const s = usePanelNav.getState().stack;
  const top = s[s.length - 1];
  return top?.screen === 'error' && top.params.kind === 'offline';
}

function clearDownTimers() {
  if (graceTimer) clearTimeout(graceTimer);
  if (pollTimer) clearInterval(pollTimer);
  graceTimer = null;
  pollTimer = null;
}

function onStatus(status: LiveStatus) {
  useLive.setState({ status, ...(status === 'open' ? { connectedAt: Date.now() } : {}) });
  if (status === 'down') {
    if (wasDown) return;
    wasDown = true;
    graceTimer = setTimeout(() => {
      graceTimer = null;
      setRetry(() => client?.reconnectNow());
      usePanelNav.getState().showError('offline');
    }, LIVE_TIMING.graceMs);
    pollTimer = setInterval(() => void useOrders.getState().sync({ silent: true }), LIVE_TIMING.pollMs);
    return;
  }
  if (status === 'open') {
    clearDownTimers();
    const recovered = wasDown;
    wasDown = false;
    if (recovered && isOfflineTop()) usePanelNav.getState().back();
    // First open and every reconnect: events may have been missed, read the list again.
    void useOrders.getState().sync({ silent: true });
  }
  if (status === 'idle') {
    clearDownTimers();
    wasDown = false;
  }
}

function dispatch(msg: RealtimeMessage) {
  useOrders.getState().apply(msg);
  for (const fn of listeners) {
    try {
      fn(msg);
    } catch (e) {
      console.error('[live] listener failed', e);
    }
  }
}

async function getTicket(): Promise<string | null> {
  try {
    const { data, error } = await panelApi().POST('/r/stream/ticket');
    return error === undefined && data?.ticket ? data.ticket : null;
  } catch {
    return null;
  }
}

/** Start the live connection (idempotent). */
export function startLive() {
  client ??= createLiveClient({
    getTicket,
    socket: (url) => socketFactory(url),
    url: streamUrl(),
    onMessage: dispatch,
    onStatus,
  });
  client.start();
}

/** Stop it (logout / shift end). */
export function stopLive() {
  client?.stop();
  client = null;
  clearDownTimers();
  wasDown = false;
  useLive.setState({ status: 'idle' });
}

/** Back online (browser `online` event) or «تلاش دوباره». */
export function reconnectLive() {
  client?.reconnectNow();
}
