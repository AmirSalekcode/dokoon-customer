import { create } from 'zustand';
import { ApiError } from '@/api/errors';
import { toast } from '@/ui/toast';
import { courierApi } from '../api/client';
import { hasActiveOrder } from '../api/errors';
import { showFullPageError } from '../errors/fullPage';
import { LocationTracker, type GeoSource, type TrackState } from '../location/tracker';
import { offerSound } from '../alert/sound';
import { useCourierNav } from '../nav/nav';
import { permissionProvider } from '../permissions/provider';

/**
 * Online status of the courier (KAN-93, courier screen specs «سفارش‌ها»): `PUT /c/status` and the location
 * tracker that follows it. Tracking runs exactly while `online || hasActive` (courier rule 3); going
 * offline with an active order is refused here and by the server (`409 ACTIVE_ORDER`).
 *
 * The contract cannot tell the app whether the server still counts it as online (contract-notes 39), so
 * every start shows «آفلاین» until the courier switches on.
 */
export const COURIER_TOAST_MS = 2600;
export const MSG = {
  online: 'آنلاین شدید',
  offline: 'آفلاین شدید',
  activeOrder: 'تا پایان سفارش نمی‌توانید آفلاین شوید',
  failed: 'وضعیت ذخیره نشد؛ دوباره تلاش کنید',
  needLocation: 'برای آنلاین شدن، اجازه‌ی موقعیت مکانی لازم است',
} as const;

interface OnlineState {
  online: boolean;
  /** `PUT /c/status` is running. */
  busy: boolean;
  /** An order is in progress (set from `GET /c/orders/active` and accept, KAN-94/95). */
  hasActive: boolean;
  tracking: TrackState;
  flip: () => Promise<void>;
  setActive: (on: boolean) => void;
  /** Sign-out: stop everything, forget the state. */
  reset: () => void;
}

let source: GeoSource | undefined;
let tracker: LocationTracker | null = null;

const getTracker = () =>
  (tracker ??= new LocationTracker({
    source,
    send: ({ lat, lng, at }) =>
      courierApi().POST('/c/location', { body: { lat, lng, at: new Date(at).toISOString() } }),
    onState: (tracking) => useOnline.setState({ tracking }),
  }));

/** Start or stop the tracker so it matches `online || hasActive`. */
function syncTracking() {
  const { online, hasActive } = useOnline.getState();
  if (online || hasActive) getTracker().start();
  else tracker?.stop();
}

async function putStatus(online: boolean): Promise<'ok' | 'active' | 'failed'> {
  try {
    const { error } = await courierApi().PUT('/c/status', { body: { online } });
    if (error === undefined) return 'ok';
    return hasActiveOrder(error) ? 'active' : 'failed';
  } catch (e) {
    // An ended session gets its page; offline / server trouble is a toast — the switch just stays put.
    if (e instanceof ApiError && e.kind === 'e401') showFullPageError(e, () => {});
    return 'failed';
  }
}

export const useOnline = create<OnlineState>((set, get) => ({
  online: false,
  busy: false,
  hasActive: false,
  tracking: 'off',

  async flip() {
    const { online, busy, hasActive } = get();
    if (busy) return;
    // The online tap is the user gesture browsers need before the offer alert may make a sound.
    if (!online) offerSound().unlock();
    if (online && hasActive) {
      toast(MSG.activeOrder, 'warn', COURIER_TOAST_MS);
      return;
    }
    if (!online && (await permissionProvider().check('location').catch(() => 'prompt')) !== 'granted') {
      // The permissions page as a normal page: back returns to the orders tab.
      toast(MSG.needLocation, 'warn', COURIER_TOAST_MS);
      useCourierNav.getState().push('perm');
      return;
    }
    set({ busy: true });
    const r = await putStatus(!online);
    if (r === 'ok') {
      set({ busy: false, online: !online });
      toast(online ? MSG.offline : MSG.online, 'info', COURIER_TOAST_MS);
    } else if (r === 'active') {
      // The server knows an order this page did not: stay online and keep tracking.
      set({ busy: false, hasActive: true });
      toast(MSG.activeOrder, 'warn', COURIER_TOAST_MS);
    } else {
      set({ busy: false });
      toast(MSG.failed, 'error', COURIER_TOAST_MS);
    }
    syncTracking();
  },

  setActive(on) {
    set({ hasActive: on });
    syncTracking();
  },

  reset() {
    tracker?.stop();
    set({ online: false, busy: false, hasActive: false, tracking: 'off' });
  },
}));

/** Tests and the Android app (KAN-104, foreground location service). */
export function setGeoSource(s: GeoSource | undefined) {
  tracker?.stop();
  tracker = null;
  source = s;
}
