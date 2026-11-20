import { REALTIME_EVENTS, type RealtimeMessage, type SocketFactory, type SocketLike } from './events';

/**
 * Restaurant live connection (KAN-62): short-lived ticket (`POST /r/stream/ticket`) → WebSocket
 * `…/r/stream?ticket=…` → one JSON frame per event (contract-notes 23). Reconnects with exponential
 * backoff + jitter; a refused ticket (close 4401) gets a fresh ticket right away. Pure logic: the app
 * wiring (offline page, list refresh) lives in live.ts.
 */
export type LiveStatus = 'idle' | 'connecting' | 'open' | 'down';

/** Reconnect delays (ms); the last one repeats. */
export const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000, 30000];
/** Close code the server uses for a missing/expired ticket (contract-notes 25). */
export const TICKET_REFUSED = 4401;

export interface LiveClientDeps {
  /** A new ticket, or null when it could not be fetched (offline, 5xx…). */
  getTicket: () => Promise<string | null>;
  socket: SocketFactory;
  /** Stream URL without the ticket. */
  url: string;
  onMessage: (msg: RealtimeMessage) => void;
  onStatus: (status: LiveStatus) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (id: unknown) => void;
  random?: () => number;
}

/** A frame we understand, or null (unknown events and garbage are ignored, never thrown). */
export function parseFrame(raw: unknown): RealtimeMessage | null {
  if (typeof raw !== 'string') return null;
  try {
    const v = JSON.parse(raw) as { event?: unknown; data?: unknown };
    if (!v || typeof v !== 'object') return null;
    if (!(REALTIME_EVENTS as readonly unknown[]).includes(v.event)) return null;
    if (!v.data || typeof v.data !== 'object') return null;
    return v as RealtimeMessage;
  } catch {
    return null;
  }
}

/** Delay before reconnect attempt n (0-based), with ±20% jitter so devices do not reconnect in sync. */
export function backoff(attempt: number, random: () => number = Math.random): number {
  const base = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
  return Math.round(base * (0.8 + 0.4 * random()));
}

export function createLiveClient(deps: LiveClientDeps) {
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
    if (!ticket) return failed();

    let s: SocketLike;
    try {
      s = deps.socket(`${deps.url}${deps.url.includes('?') ? '&' : '?'}ticket=${encodeURIComponent(ticket)}`);
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
      const msg = parseFrame((e as MessageEvent).data);
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
