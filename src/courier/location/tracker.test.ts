import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { distanceM, LocationTracker, type GeoErrorKind, type GeoFix, type GeoSource } from './tracker';

// KAN-93 (CP-09): the tracker sends only while running, throttled by time and distance, and a stop is final.
function fakeSource() {
  let onFix: ((f: GeoFix) => void) | null = null;
  let onErr: ((k: GeoErrorKind) => void) | null = null;
  const src: GeoSource & { emit: (f: GeoFix) => void; fail: (k: GeoErrorKind) => void; watching: () => boolean } =
    {
      watch(f, e) {
        onFix = f;
        onErr = e;
        return () => {
          onFix = null;
          onErr = null;
        };
      },
      emit: (f) => onFix?.(f),
      fail: (k) => onErr?.(k),
      watching: () => onFix !== null,
    };
  return src;
}

const at = (lat: number, lng = 51.8664): GeoFix => ({ lat, lng, at: Date.now() });
// ~111 m per 0.001° of latitude.
const BASE = 32.0105;

let now = 0;
beforeEach(() => {
  vi.useFakeTimers();
  now = 1_000_000;
});
afterEach(() => vi.useRealTimers());

function setup() {
  const source = fakeSource();
  const sent: GeoFix[] = [];
  const states: string[] = [];
  const t = new LocationTracker({
    source,
    send: (f) => {
      sent.push(f);
      return Promise.resolve();
    },
    now: () => now,
    onState: (s) => states.push(s),
  });
  return { source, sent, states, t };
}
const tick = async (ms: number) => {
  now += ms;
  await vi.advanceTimersByTimeAsync(ms);
};

describe('LocationTracker', () => {
  it('offline (never started) → nothing is watched or sent', async () => {
    const { source, sent, t } = setup();
    source.emit(at(BASE));
    await tick(5 * 60_000);
    expect(source.watching()).toBe(false);
    expect(sent).toHaveLength(0);
    expect(t.state).toBe('off');
  });

  it('after stop → the watch ends and no position or heartbeat is sent', async () => {
    const { source, sent, t } = setup();
    t.start();
    source.emit(at(BASE));
    await tick(0);
    expect(sent).toHaveLength(1);
    t.stop();
    expect(source.watching()).toBe(false);
    source.emit(at(BASE + 0.01));
    await tick(10 * 60_000);
    expect(sent).toHaveLength(1);
    expect(t.state).toBe('off');
  });

  it('first fix is sent at once; then only after the interval and enough movement', async () => {
    const { source, sent, t } = setup();
    t.start();
    source.emit(at(BASE));
    await tick(0);
    await tick(3_000);
    source.emit(at(BASE + 0.002)); // moved ~220 m but too soon
    await tick(0);
    expect(sent).toHaveLength(1);
    await tick(8_000);
    source.emit(at(BASE + 0.00005)); // ~5 m from the last report: waits
    await tick(0);
    expect(sent).toHaveLength(1);
    source.emit(at(BASE + 0.002)); // far enough, interval passed
    await tick(0);
    expect(sent).toHaveLength(2);
    expect(sent[1].lat).toBeCloseTo(BASE + 0.002);
  });

  it('standing still the heartbeat repeats the last position every minute', async () => {
    const { source, sent, t } = setup();
    t.start();
    source.emit(at(BASE));
    await tick(0);
    await tick(60_000);
    expect(sent).toHaveLength(2);
    expect(sent[1].lat).toBe(BASE);
    await tick(60_000);
    expect(sent).toHaveLength(3);
  });

  it('no heartbeat before the first position', async () => {
    const { sent, t } = setup();
    t.start();
    await tick(3 * 60_000);
    expect(sent).toHaveLength(0);
    expect(t.state).toBe('waiting');
  });

  it('states: waiting → active, a refused permission → denied, stop → off', async () => {
    const { source, states, t } = setup();
    t.start();
    source.emit(at(BASE));
    source.fail('denied');
    t.stop();
    expect(states).toEqual(['waiting', 'active', 'denied', 'off']);
  });

  it('a failed send does not throw and the next due position goes out', async () => {
    const source = fakeSource();
    let calls = 0;
    const t = new LocationTracker({
      source,
      now: () => now,
      send: () => (++calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve()),
    });
    t.start();
    source.emit(at(BASE));
    await tick(0);
    await tick(60_000);
    expect(calls).toBe(2);
    t.stop();
  });
});

it('distanceM: 0.001° of latitude is about 111 m', () => {
  expect(distanceM({ lat: BASE, lng: 51 }, { lat: BASE + 0.001, lng: 51 })).toBeGreaterThan(105);
  expect(distanceM({ lat: BASE, lng: 51 }, { lat: BASE + 0.001, lng: 51 })).toBeLessThan(117);
});

it('without a source option the browser watch is used (an undefined option keeps the default)', () => {
  const watch = vi.fn(() => 1);
  const clearWatch = vi.fn();
  vi.stubGlobal('navigator', { ...navigator, geolocation: { watchPosition: watch, clearWatch } });
  const t = new LocationTracker({ source: undefined, send: () => Promise.resolve() });
  t.start();
  expect(watch).toHaveBeenCalledTimes(1);
  t.stop();
  expect(clearWatch).toHaveBeenCalledWith(1);
  vi.unstubAllGlobals();
});
