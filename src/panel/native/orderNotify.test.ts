import { describe, expect, it, vi } from 'vitest';
import type { Order } from '../api/types';
import type { RealtimeMessage } from '../realtime/events';
import { NOTIFY_TITLE, startOrderNotifier } from './orderNotify';

// KAN-72: local new-order notification while the restaurant app is in the background.
function setup() {
  let live: (m: RealtimeMessage) => void = () => {};
  let state: (a: boolean) => void = () => {};
  const plugin = {
    notifyOrder: vi.fn(async () => ({ shown: true })),
    cancelOrder: vi.fn(async () => {}),
    requestNotifications: vi.fn(async () => ({ granted: true })),
  };
  const stop = startOrderNotifier({
    plugin,
    onAppState: (fn) => ((state = fn), () => {}),
    onLive: (fn) => ((live = fn), () => {}),
  });
  const created = (id: string, no = '12') =>
    live({ event: 'order.created', data: { id, no, status: 'new' } as Order });
  return {
    plugin,
    stop,
    created,
    live: (m: RealtimeMessage) => live(m),
    background: () => state(false),
    foreground: () => state(true),
  };
}

describe('startOrderNotifier', () => {
  it('asks for the notification permission at shift start', () => {
    expect(setup().plugin.requestNotifications).toHaveBeenCalledOnce();
  });

  it('stays quiet in the foreground (the full-screen alert rings there)', () => {
    const t = setup();
    t.created('o1');
    expect(t.plugin.notifyOrder).not.toHaveBeenCalled();
  });

  it('posts one notification per new order in the background', () => {
    const t = setup();
    t.background();
    t.created('o1', '42');
    t.created('o1', '42');
    expect(t.plugin.notifyOrder).toHaveBeenCalledOnce();
    expect(t.plugin.notifyOrder).toHaveBeenCalledWith({
      id: 'o1',
      title: NOTIFY_TITLE,
      body: expect.stringContaining('#۴۲'),
    });
  });

  it('withdraws it when the order is answered, cancelled or expired', () => {
    const t = setup();
    t.background();
    t.created('a');
    t.created('b');
    t.created('c');
    t.live({ event: 'order.updated', data: { id: 'a', status: 'new' } as Order });
    expect(t.plugin.cancelOrder).not.toHaveBeenCalled();
    t.live({ event: 'order.updated', data: { id: 'a', status: 'prep' } as Order });
    t.live({ event: 'order.cancelled', data: { orderId: 'b', reason: 'x' } });
    t.live({ event: 'order.expired', data: { orderId: 'c' } });
    expect(t.plugin.cancelOrder.mock.calls.map((c) => (c as unknown as [{ id: string }])[0].id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('clears all of them when the app comes back and when the shift ends', () => {
    const t = setup();
    t.background();
    t.created('a');
    t.foreground();
    expect(t.plugin.cancelOrder).toHaveBeenCalledWith({ id: 'a' });
    t.background();
    t.created('b');
    t.stop();
    expect(t.plugin.cancelOrder).toHaveBeenCalledWith({ id: 'b' });
  });
});
