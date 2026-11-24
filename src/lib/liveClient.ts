import type { SocketFactory, SocketLike } from './socket';

/**
 * Reconnecting live connection shared by the restaurant panel (KAN-62) and the courier app (KAN-94):
 * optional short-lived ticket → WebSocket `…/stream?ticket=…` → one JSON frame per event (contract-notes 23,
 * 33). Reconnects with exponential backoff + jitter; a refused ticket (close 4401) gets a fresh ticket right
 * away. Pure logic: each app wires the offline handling and list refresh itself.
 */
export type LiveStatus = 'idle' | 'connecting' | 'open' | 'down';

/** Reconnect delays (ms); the last one repeats. */
export const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000, 30000];
/** Close code the server uses for a missing/expired ticket (contract-notes 25). */
export const TICKET_REFUSED = 4401;

export interface LiveClientDeps<M> {
  /**
   * A new ticket, or null when it could not be fetched (offline, 5xx…). `''` = no ticket needed (the web
   * courier app authenticates the socket with its session cookie).
   */
  getTicket: () => Promise<string | null>;
  socket: SocketFactory;
  /** Stream URL without the ticket. */
  url: string;
  /** One text frame → a known message, or null (ignored). */
  parse: (raw: unknown) => M | null;
  onMessage: (msg: M) => void;
  onStatus: (status: LiveStatus) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (id: unknown) => void;
  random?: () => number;
}

/** Delay before reconnect attempt n (0-based), with ±20% jitter so devices do not reconnect in sync. */
export function backoff(attempt: number, random: () => number = Math.random): number {
  const base = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
  return Math.round(base * (0.8 + 0.4 * random()));
}

export function createLiveClient<M>(deps: LiveClientDeps<M>) {
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));
  const random = deps.random ?? Math.random;

  let status: LiveStatus = 'idle';
  let running = false;
  let socket: SocketLike | null = null;
  let attempt = 0;
  let timer: unknown = null;
  /** Bumps on stop/restart so late callbacks of an old socket or ticket are ignored. */
  let generation = 0;

  const setStatus = (s: LiveStatus) => {
    if (s === status) return;
    status = s;
    deps.onStatus(s);
  };

  function schedule(ms: number) {
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      void connect();
    }, ms);
  }

  function failed() {
    if (!running) return;
    socket = null;
    setStatus('down');
    schedule(backoff(attempt, random));
    attempt += 1;
  }

  async function connect() {
    if (!running) return;
    const gen = generation;
    if (status !== 'down') setStatus('connecting');
    const ticket = await deps.getTicket().catch(() => null);
    if (gen !== generation || !running) return;
    if (ticket === null) return failed();

    let s: SocketLike;
    try {
      s = deps.socket(
        ticket
          ? `${deps.url}${deps.url.includes('?') ? '&' : '?'}ticket=${encodeURIComponent(ticket)}`
          : deps.url,
      );
    } catch {
      return failed();
    }
    socket = s;
    let opened = false;
    s.addEventListener('open', () => {
      if (gen !== generation) return;
      opened = true;
      attempt = 0;
      setStatus('open');
    });
    s.addEventListener('message', (e) => {
      if (gen !== generation) return;
      const msg = deps.parse((e as MessageEvent).data);
      if (msg) deps.onMessage(msg);
    });
    s.addEventListener('close', (e) => {
      if (gen !== generation || socket !== s) return;
      const code = (e as CloseEvent).code;
      // A refused ticket on the first try: get a new one at once (clock skew, reused ticket).
      if (code === TICKET_REFUSED && !opened && attempt === 0) {
        attempt = 1;
        socket = null;
        void connect();
        return;
      }
      failed();
    });
  }

  return {
    get status() {
      return status;
    },
    start() {
      if (running) return;
      running = true;
      attempt = 0;
      generation += 1;
      void connect();
    },
    stop() {
      running = false;
      generation += 1;
      if (timer !== null) clearTimer(timer);
      timer = null;
      const s = socket;
      socket = null;
      try {
        s?.close(1000, 'shift ended');
      } catch {
        /* already closed */
      }
      setStatus('idle');
    },
    /** «تلاش دوباره» / back online: skip the remaining backoff. */
    reconnectNow() {
      if (!running || status === 'open' || status === 'connecting') return;
      if (timer !== null) clearTimer(timer);
      timer = null;
      generation += 1;
      void connect();
    },
  };
}

export type LiveClient = ReturnType<typeof createLiveClient>;
