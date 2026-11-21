import type { CourierRealtimeMessage, SocketLike } from '../realtime/events';
import { addOffer, db, expireDue, takeByOther } from './db';

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
    /* the courier stream is server → client only (location goes over REST) */
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
  deliver(msg: CourierRealtimeMessage): void {
    if (this.readyState === OPEN) this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(msg) }));
  }
  /** @internal */
  finish(code: number, reason = ''): void {
    if (this.readyState === CLOSED) return;
    this.readyState = CLOSED;
    this.onClose(this);
    this.dispatchEvent(new CloseEvent('close', { code, reason, wasClean: code === 1000 }));
  }
}

export interface CourierMockStreamOptions {
  /** Demo: a new offer every N ms while the courier is online and connected (0 = off). */
  newOfferEveryMs?: number;
}

/**
 * Mock courier realtime server (WS «offers», contract-notes 33). `connect(url)` is the socket factory for
 * mock builds; tests and dev tools use `emit`, `takeByOther` (another courier wins → `offer.gone taken`)
 * and `dropAll` / `outage` (connection loss → offline handling).
 */
export function createCourierMockStream({ newOfferEveryMs = 0 }: CourierMockStreamOptions = {}) {
  const sockets = new Set<MockSocket>();
  /** Simulated outage: every connection is lost and new ones fail until it ends. */
  let down = false;
  let timers: ReturnType<typeof setInterval>[] = [];

  const emit = (msg: CourierRealtimeMessage) => sockets.forEach((s) => s.deliver(msg));

  function startTimers() {
    if (timers.length) return;
    // Server rule: offers nobody accepted close at expiresAt.
    timers.push(
      setInterval(() => {
        for (const offerId of expireDue()) emit({ event: 'offer.gone', data: { offerId, reason: 'expired' } });
      }, 1000),
    );
    if (newOfferEveryMs > 0)
      timers.push(
        setInterval(() => {
          // Offers only reach couriers who are online and free.
          if (db.online && !db.active) emit({ event: 'offer.created', data: addOffer() });
        }, newOfferEveryMs),
      );
  }

  function stop() {
    timers.forEach(clearInterval);
    timers = [];
  }

  function connect(_url = ''): SocketLike {
    const socket = new MockSocket((s) => {
      sockets.delete(s);
      if (!sockets.size) stop();
    });
    queueMicrotask(() => {
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
    /** Another courier accepted this offer first: it leaves every list (`offer.gone`, reason taken). */
    takeByOther: (offerId: string) => {
      if (takeByOther(offerId)) emit({ event: 'offer.gone', data: { offerId, reason: 'taken' } });
    },
    /** A new offer right now (demo / E2E), if the courier is online and free. */
    pushOffer: () => {
      if (db.online && !db.active) emit({ event: 'offer.created', data: addOffer() });
    },
    /** Every connection is lost (abnormal close 1006). */
    dropAll: () => [...sockets].forEach((s) => s.finish(1006, 'connection lost')),
    /** Start/end an outage. */
    outage: (on: boolean) => {
      down = on;
      if (on) [...sockets].forEach((s) => s.finish(1006, 'connection lost'));
    },
    get connected() {
      return sockets.size;
    },
    stop,
  };
}

export type CourierMockStream = ReturnType<typeof createCourierMockStream>;
