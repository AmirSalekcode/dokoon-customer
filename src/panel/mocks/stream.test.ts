import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RealtimeMessage } from '../realtime/events';
import { REALTIME_EVENTS } from '../realtime/events';
import { db, resetPanelMockDb } from './db';
import { createMockStream } from './stream';

// KAN-56: mock of the realtime WebSocket (contract x-realtime). The real client (KAN-62) gets a socket
// factory; mock builds pass this one, so tests, the browser demo and the Android app share it.
const URL_OK = 'wss://api.test/v1/r/stream?ticket=t-1';

beforeEach(() => {
  vi.useFakeTimers();
  resetPanelMockDb();
});
afterEach(() => vi.useRealTimers());

function open(hub: ReturnType<typeof createMockStream>, url = URL_OK) {
  const ws = hub.connect(url);
  const messages: RealtimeMessage[] = [];
  const closes: number[] = [];
  let opened = false;
  ws.addEventListener('open', () => (opened = true));
  ws.addEventListener('message', (e) => messages.push(JSON.parse((e as MessageEvent).data as string)));
  ws.addEventListener('close', (e) => closes.push((e as CloseEvent).code));
  return { ws, messages, closes, isOpen: () => opened };
}

describe('mock realtime stream', () => {
  it('opens asynchronously like a real socket', async () => {
    const hub = createMockStream({ newOrderEveryMs: 0 });
    const c = open(hub);
    expect(c.ws.readyState).toBe(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(c.isOpen()).toBe(true);
    expect(c.ws.readyState).toBe(1);
  });

  it('a connection without a ticket is refused (close 4401)', async () => {
    const hub = createMockStream({ newOrderEveryMs: 0 });
    const c = open(hub, 'wss://api.test/v1/r/stream');
    await vi.advanceTimersByTimeAsync(0);
    expect(c.closes).toEqual([4401]);
  });

  it('delivers every contract event to every connected device as {event, data}', async () => {
    const hub = createMockStream({ newOrderEveryMs: 0 });
    const a = open(hub);
    const b = open(hub);
    await vi.advanceTimersByTimeAsync(0);
    for (const name of REALTIME_EVENTS) hub.emit({ event: name, data: { sample: name } } as never);
    expect(a.messages.map((m) => m.event)).toEqual([...REALTIME_EVENTS]);
    expect(b.messages).toEqual(a.messages);
  });

  it('the demo sends a new order on a timer (order.created, also in the orders list)', async () => {
    const hub = createMockStream({ newOrderEveryMs: 1000 });
    const c = open(hub);
    await vi.advanceTimersByTimeAsync(1000);
    expect(c.messages).toHaveLength(1);
    expect(c.messages[0]).toMatchObject({ event: 'order.created', data: { status: 'new' } });
    expect(db.orders[0].id).toBe((c.messages[0].data as { id: string }).id);
    hub.stop();
  });

  it('unanswered new orders expire at their deadline (order.expired)', async () => {
    const hub = createMockStream({ newOrderEveryMs: 0 });
    const c = open(hub);
    await vi.advanceTimersByTimeAsync(181_000);
    const expired = c.messages.filter((m) => m.event === 'order.expired').map((m) => m.data);
    expect(expired).toEqual(expect.arrayContaining([{ orderId: 'o1' }, { orderId: 'o2' }]));
    expect(db.orders.find((o) => o.id === 'o1')?.status).toBe('expired');
    hub.stop();
  });

  it('dropAll() simulates losing the connection; a new connection works again', async () => {
    const hub = createMockStream({ newOrderEveryMs: 0 });
    const c = open(hub);
    await vi.advanceTimersByTimeAsync(0);
    hub.dropAll();
    expect(c.closes).toEqual([1006]);
    expect(c.ws.readyState).toBe(3);
    hub.emit({ event: 'notification.created', data: {} } as never);
    expect(c.messages).toHaveLength(0);
    const again = open(hub);
    await vi.advanceTimersByTimeAsync(0);
    hub.emit({ event: 'notification.created', data: {} } as never);
    expect(again.messages).toHaveLength(1);
  });

  it('client close() reports a clean close and stops delivery', async () => {
    const hub = createMockStream({ newOrderEveryMs: 0 });
    const c = open(hub);
    await vi.advanceTimersByTimeAsync(0);
    c.ws.close();
    expect(c.closes).toEqual([1000]);
    hub.emit({ event: 'notification.created', data: {} } as never);
    expect(c.messages).toHaveLength(0);
  });
});
