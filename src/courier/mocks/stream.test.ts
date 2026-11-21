import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCourierFrame, type CourierRealtimeMessage, type SocketLike } from '../realtime/events';
import * as S from './db';
import { createCourierMockStream } from './stream';

// KAN-86: the mock courier WebSocket (WS «offers»): new offers while online, offer.gone when another
// courier wins or the 30 s run out, connection loss.
function listen(socket: SocketLike) {
  const got: CourierRealtimeMessage[] = [];
  const closes: number[] = [];
  socket.addEventListener('message', (e) => {
    const m = parseCourierFrame((e as MessageEvent).data);
    if (m) got.push(m);
  });
  socket.addEventListener('close', (e) => closes.push((e as CloseEvent).code));
  return { got, closes };
}
const flush = () => new Promise<void>((r) => queueMicrotask(r));

beforeEach(() => {
  S.resetCourierMockDb();
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
});
afterEach(() => vi.useRealTimers());

describe('courier mock stream', () => {
  it('opens and pushes a new offer every N ms, only while online and free', async () => {
    const stream = createCourierMockStream({ newOfferEveryMs: 5000 });
    const socket = stream.connect('wss://x/v1/c/stream');
    const { got } = listen(socket);
    await flush();
    expect(socket.readyState).toBe(1);
    vi.advanceTimersByTime(5000);
    expect(got).toEqual([]); // offline: nothing
    S.setOnline(true);
    vi.advanceTimersByTime(5000);
    expect(got.filter((m) => m.event === 'offer.created')).toHaveLength(1);
    const offer = got[0].data as { id: string; custPhone?: string };
    expect(S.db.offers.map((o) => o.id)).toContain(offer.id);
    expect(offer).not.toHaveProperty('custPhone');
    S.acceptOffer('of1');
    vi.advanceTimersByTime(5000);
    expect(got.filter((m) => m.event === 'offer.created')).toHaveLength(1); // busy: no more
    stream.stop();
  });

  it('expired offers leave with offer.gone {reason: expired}', async () => {
    const stream = createCourierMockStream();
    const { got } = listen(stream.connect('wss://x'));
    await flush();
    S.setOnline(true);
    vi.advanceTimersByTime(31_000);
    expect(got).toContainEqual({ event: 'offer.gone', data: { offerId: 'of1', reason: 'expired' } });
    expect(S.db.offers.map((o) => o.id)).not.toContain('of1');
    stream.stop();
  });

  it('takeByOther: the offer leaves every device with reason taken; accepting it is then 409', async () => {
    const stream = createCourierMockStream();
    const a = listen(stream.connect('wss://x'));
    const b = listen(stream.connect('wss://x'));
    await flush();
    S.setOnline(true);
    stream.takeByOther('of2');
    const gone = { event: 'offer.gone', data: { offerId: 'of2', reason: 'taken' } };
    expect(a.got).toContainEqual(gone);
    expect(b.got).toContainEqual(gone);
    expect(S.acceptOffer('of2')).toEqual({ ok: false, status: 409, code: 'OFFER_TAKEN' });
    stream.stop();
  });

  it('dropAll and outages close with 1006; new connections fail until the outage ends', async () => {
    const stream = createCourierMockStream();
    const first = listen(stream.connect('wss://x'));
    await flush();
    expect(stream.connected).toBe(1);
    stream.outage(true);
    expect(first.closes).toEqual([1006]);
    const during = listen(stream.connect('wss://x'));
    await flush();
    expect(during.closes).toEqual([1006]);
    stream.outage(false);
    const after = stream.connect('wss://x');
    await flush();
    expect(after.readyState).toBe(1);
    stream.dropAll();
    expect(after.readyState).toBe(3);
    expect(stream.connected).toBe(0);
  });
});

describe('parseCourierFrame', () => {
  it('accepts the four events and ignores unknown or broken frames', () => {
    const frame = JSON.stringify({ event: 'offer.gone', data: { offerId: 'o1', reason: 'taken' } });
    expect(parseCourierFrame(frame)).toEqual({ event: 'offer.gone', data: { offerId: 'o1', reason: 'taken' } });
    expect(parseCourierFrame(JSON.stringify({ event: 'order.updated', data: { id: 'x' } }))?.event).toBe(
      'order.updated',
    );
    expect(parseCourierFrame(JSON.stringify({ event: 'chat.message', data: {} }))).toBeNull();
    expect(parseCourierFrame(JSON.stringify({ event: 'offer.created' }))).toBeNull();
    expect(parseCourierFrame('{oops')).toBeNull();
    expect(parseCourierFrame(new ArrayBuffer(2))).toBeNull();
  });
});
