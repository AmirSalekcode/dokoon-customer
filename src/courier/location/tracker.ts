/**
 * Courier location tracking (KAN-93, courier rule 3 and security checklist «موقعیت»). The tracker runs only
 * while the courier is online or has an active order; `stop()` ends the position watch, the heartbeat and
 * every later send, so an offline courier is never tracked. Position reports go to `POST /c/location`
 * through the `send` callback, throttled by time and distance.
 */
export interface GeoFix {
  lat: number;
  lng: number;
  /** When the device measured it (ms since epoch). */
  at: number;
}

export type GeoErrorKind = 'denied' | 'unavailable';

/** Where positions come from: the browser here, a Capacitor foreground service later (KAN-104). */
export interface GeoSource {
  /** Start watching; returns the function that stops it. */
  watch: (onFix: (fix: GeoFix) => void, onError: (kind: GeoErrorKind) => void) => () => void;
}

/** `off` = not tracking; `waiting` = tracking, no position yet; `active` = positions arrive. */
export type TrackState = 'off' | 'waiting' | 'active' | GeoErrorKind;

export interface TrackerOptions {
  send: (fix: GeoFix) => Promise<unknown>;
  source?: GeoSource;
  /** No two reports closer than this in time, unless… */
  minIntervalMs?: number;
  /** …a report is due at least this often, even standing still (heartbeat). */
  maxIntervalMs?: number;
  /** Movement below this (metres) waits for the heartbeat. */
  minDistanceM?: number;
  now?: () => number;
  onState?: (state: TrackState) => void;
}

export const TRACK_DEFAULTS = { minIntervalMs: 10_000, maxIntervalMs: 60_000, minDistanceM: 30 } as const;

/** Great-circle distance in metres. */
export function distanceM(a: Pick<GeoFix, 'lat' | 'lng'>, b: Pick<GeoFix, 'lat' | 'lng'>): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Browser Geolocation (`watchPosition`). Works only while the page is open (no background on the web). */
export const webGeoSource: GeoSource = {
  watch(onFix, onError) {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      onError('unavailable');
      return () => {};
    }
    const id = navigator.geolocation.watchPosition(
      (p) => onFix({ lat: p.coords.latitude, lng: p.coords.longitude, at: p.timestamp || Date.now() }),
      (e) => onError(e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  },
};

export class LocationTracker {
  private readonly o: Required<Omit<TrackerOptions, 'onState'>> & Pick<TrackerOptions, 'onState'>;
  private unwatch: (() => void) | null = null;
  private beat: ReturnType<typeof setInterval> | null = null;
  private last: GeoFix | null = null;
  private sent: { fix: GeoFix; time: number } | null = null;
  private inFlight = false;
  private st: TrackState = 'off';

  constructor(opts: TrackerOptions) {
    this.o = { ...TRACK_DEFAULTS, ...opts, source: opts.source ?? webGeoSource, now: opts.now ?? Date.now };
  }

  get running() {
    return this.unwatch !== null;
  }

  get state(): TrackState {
    return this.st;
  }

  start(): void {
    if (this.running) return;
    this.setState('waiting');
    this.unwatch = this.o.source.watch(
      (fix) => this.onFix(fix),
      (kind) => this.running && this.setState(kind),
    );
    // Standing still, the browser reports nothing new: repeat the last position so the server knows
    // the courier is still there and reachable.
    this.beat = setInterval(() => this.heartbeat(), this.o.maxIntervalMs);
  }

  /** Full stop: no watch, no timer, nothing kept, nothing sent afterwards. */
  stop(): void {
    this.unwatch?.();
    this.unwatch = null;
    if (this.beat) clearInterval(this.beat);
    this.beat = null;
    this.last = null;
    this.sent = null;
    this.setState('off');
  }

  private setState(s: TrackState) {
    if (s === this.st) return;
    this.st = s;
    this.o.onState?.(s);
  }

  private onFix(fix: GeoFix) {
    if (!this.running) return;
    this.last = fix;
    this.setState('active');
    const now = this.o.now();
    const prev = this.sent;
    const due =
      !prev ||
      now - prev.time >= this.o.maxIntervalMs ||
      (now - prev.time >= this.o.minIntervalMs && distanceM(prev.fix, fix) >= this.o.minDistanceM);
    if (due) this.push(fix, now);
  }

  private heartbeat() {
    if (!this.running || !this.last) return;
    const now = this.o.now();
    if (this.sent && now - this.sent.time < this.o.maxIntervalMs) return;
    this.push({ ...this.last, at: now }, now);
  }

  private push(fix: GeoFix, now: number) {
    if (this.inFlight) return;
    this.inFlight = true;
    this.sent = { fix, time: now };
    // A failed report (offline, server error) is not retried: the next due position or heartbeat carries on.
    void this.o
      .send(fix)
      .catch(() => {})
      .finally(() => {
        this.inFlight = false;
      });
  }
}
