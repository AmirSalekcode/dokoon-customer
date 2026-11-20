import type { RealtimeMessage, SocketLike } from '../realtime/events';
import { addIncomingOrder, expireDue } from './db';

const CONNECTING = 0;
const OPEN = 1;
const CLOSED = 3;

/** A WebSocket look-alike living in the page (works in tests, the browser demo and the Android WebView). */
class MockSocket extends EventTarget implements SocketLike {
  readyState = CONNECTING;
  constructor(private readonly onClose: (s: MockSocket) => void) {
    super();
  }
  send(): void {
    /* the restaurant stream is server → client only */
  }
  close(code = 1000, reason = ''): void {
    this.finish(code, reason);
  }
  /** @internal */
  open(): void {
    if (this.readyState !== CONNECTING) return;
    this.readyState = OPEN;
    this.dispatchEvent(new Event('open'));
  }
  /** @internal */
  deliver(msg: RealtimeMessage): void {
    if (this.readyState === OPEN)
      this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(msg) }));
  }
  /** @internal */
  finish(code: number, reason = ''): void {
    if (this.readyState === CLOSED) return;
    this.readyState = CLOSED;
    this.onClose(this);
    this.dispatchEvent(new CloseEvent('close', { code, reason, wasClean: code === 1000 }));
  }
}

export interface MockStreamOptions {
  /** Demo: a new order every N ms while a device is connected (0 = off). */
  newOrderEveryMs?: number;
}

/**
 * Mock realtime server. `connect(url)` is the socket factory for mock builds; tests and dev tools use
 * `emit` (any x-realtime event) and `dropAll` (connection loss → offline page, KAN-62).
 */
export function createMockStream({ newOrderEveryMs = 0 }: MockStreamOptions = {}) {
  const sockets = new Set<MockSocket>();
  /** Simulated outage: every connection is lost and new ones fail until it ends. */
  let down = false;
  let timers: ReturnType<typeof setInterval>[] = [];

  const emit = (msg: RealtimeMessage) => sockets.forEach((s) => s.deliver(msg));

  function startTimers() {
    if (timers.length) return;
    // Server rule: new orders nobody answered expire at acceptDeadline.
    timers.push(
      setInterval(() => {
        for (const o of expireDue()) emit({ event: 'order.expired', data: { orderId: o.id! } });
      }, 1000),
    );
    if (newOrderEveryMs > 0)
      timers.push(
        setInterval(() => emit({ event: 'order.created', data: addIncomingOrder() }), newOrderEveryMs),
      );
  }

  function stop() {
    timers.forEach(clearInterval);
    timers = [];
  }

  function connect(url: string): SocketLike {
    const socket = new MockSocket((s) => {
      sockets.delete(s);
      if (!sockets.size) stop();
    });
    const hasTicket = new URL(url, 'http://x').searchParams.has('ticket');
    queueMicrotask(() => {
      if (!hasTicket) return socket.finish(4401, 'ticket required');
      if (down) return socket.finish(1006, 'server unreachable');
      sockets.add(socket);
      socket.open();
      startTimers();
    });
    return socket;
  }

  return {
    connect,
    emit,
    /** Every device loses the connection (abnormal close 1006). */
    dropAll: () => [...sockets].forEach((s) => s.finish(1006, 'connection lost')),
    /** Start/end an outage (KAN-62 demo and E2E: offline page, 15 s refresh, recovery). */
    outage: (on: boolean) => {
      down = on;
      if (on) [...sockets].forEach((s) => s.finish(1006, 'connection lost'));
    },
    /** Devices currently connected. */
    get connected() {
      return sockets.size;
    },
    stop,
  };
}

export type MockStream = ReturnType<typeof createMockStream>;
