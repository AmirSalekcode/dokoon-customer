import { describe, expect, it, vi } from 'vitest';
import { backoff, BACKOFF_MS, createLiveClient, parseFrame, type LiveStatus } from './client';
import type { SocketLike } from './events';

// KAN-62: ticket → WebSocket, frames, reconnect with backoff, refused ticket, stop.
class FakeSocket extends EventTarget implements SocketLike {
  readyState = 0;
  closed: number | null = null;
  constructor(public url: string) {
    super();
  }
  send() {}
  close(code = 1000) {
    this.closed = code;
  }
  open() {
    this.readyState = 1;
    this.dispatchEvent(new Event('open'));
  }
  msg(data: unknown) {
    this.dispatchEvent(
      new MessageEvent('message', { data: typeof data === 'string' ? data : JSON.stringify(data) }),
    );
  }
  drop(code = 1006) {
    this.readyState = 3;
    this.dispatchEvent(new CloseEvent('close', { code }));
  }
}

function setup(ticket: () => Promise<string | null> = async () => 't1') {
  const sockets: FakeSocket[] = [];
  const timers: { fn: () => void; ms: number }[] = [];
  const statuses: LiveStatus[] = [];
  const messages: unknown[] = [];
  const getTicket = vi.fn(ticket);
  const client = createLiveClient({
    getTicket,
    url: 'wss://api.test/v1/r/stream',
    socket: (url) => {
      const s = new FakeSocket(url);
      sockets.push(s);
      return s;
    },
    onMessage: (m) => messages.push(m),
    onStatus: (s) => statuses.push(s),
    setTimer: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    clearTimer: () => {
      timers.length = 0;
    },
    random: () => 0.5,
  });
  const flush = () => new Promise((r) => setTimeout(r, 0));
  return { client, sockets, timers, statuses, messages, getTicket, flush };
}

describe('frames', () => {
  it('accepts known events with a data object; ignores everything else', () => {
    expect(parseFrame(JSON.stringify({ event: 'order.created', data: { id: 'o1' } }))).toEqual({
      event: 'order.created',
      data: { id: 'o1' },
    });
    expect(parseFrame(JSON.stringify({ event: 'hack', data: {} }))).toBeNull();
    expect(parseFrame(JSON.stringify({ event: 'order.created' }))).toBeNull();
    expect(parseFrame('not json')).toBeNull();
    expect(parseFrame(42)).toBeNull();
  });
});

describe('connection', () => {
  it('gets a ticket, connects with it, reports open and passes events', async () => {
    const t = setup();
    t.client.start();
    await t.flush();
    expect(t.sockets[0].url).toBe('wss://api.test/v1/r/stream?ticket=t1');
    t.sockets[0].open();
    expect(t.client.status).toBe('open');
    t.sockets[0].msg({ event: 'order.expired', data: { orderId: 'o9' } });
    t.sockets[0].msg('garbage');
    expect(t.messages).toEqual([{ event: 'order.expired', data: { orderId: 'o9' } }]);
    expect(t.statuses).toEqual(['connecting', 'open']);
  });

  it('a lost connection goes down and reconnects with growing backoff, reset after success', async () => {
    const t = setup();
    t.client.start();
    await t.flush();
    t.sockets[0].open();
    t.sockets[0].drop();
    expect(t.client.status).toBe('down');
    expect(t.timers.map((x) => x.ms)).toEqual([BACKOFF_MS[0]]);
    t.timers.shift()!.fn();
    await t.flush();
    t.sockets[1].drop(); // still unreachable
    expect(t.timers.at(-1)!.ms).toBe(BACKOFF_MS[1]);
    t.timers.shift()!.fn();
    await t.flush();
    t.sockets[2].open();
    expect(t.client.status).toBe('open');
    expect(t.getTicket).toHaveBeenCalledTimes(3); // a fresh ticket every time (one-time use)
    t.sockets[2].drop();
    expect(t.timers.at(-1)!.ms).toBe(BACKOFF_MS[0]);
  });

  it('no ticket (offline / 5xx) counts as a failed attempt', async () => {
    const t = setup(async () => null);
    t.client.start();
    await t.flush();
    expect(t.sockets).toHaveLength(0);
    expect(t.client.status).toBe('down');
    expect(t.timers).toHaveLength(1);
  });

  it('a refused ticket (4401) is retried at once with a new ticket', async () => {
    let n = 0;
    const t = setup(async () => `t${++n}`);
    t.client.start();
    await t.flush();
    t.sockets[0].drop(4401);
    await t.flush();
    expect(t.sockets[1].url).toContain('ticket=t2');
    expect(t.timers).toHaveLength(0);
  });

  it('reconnectNow skips the backoff; stop closes and never reconnects', async () => {
    const t = setup();
    t.client.start();
    await t.flush();
    t.sockets[0].drop();
    t.client.reconnectNow();
    await t.flush();
    expect(t.sockets).toHaveLength(2);
    t.sockets[1].open();
    t.client.stop();
    expect(t.sockets[1].closed).toBe(1000);
    expect(t.client.status).toBe('idle');
    t.sockets[1].drop();
    expect(t.timers).toHaveLength(0);
  });

  it('backoff has ±20% jitter and caps at 30 s', () => {
    expect(backoff(0, () => 0)).toBe(800);
    expect(backoff(0, () => 1)).toBe(1200);
    expect(backoff(99, () => 0.5)).toBe(30000);
  });
});
