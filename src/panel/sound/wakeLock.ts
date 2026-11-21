import { DokoonNative } from '@/lib/native';
import { isNative } from '@/lib/platform';

/**
 * Screen Wake Lock during the shift (D-98): the screen must stay on to hear new orders. The browser drops
 * the lock when the tab is hidden, so it is taken again when the panel becomes visible.
 * Unsupported (older iOS / WebView) → the caller shows the «turn off auto-lock» message instead.
 */
interface SentinelLike {
  release(): Promise<void>;
  addEventListener?(type: 'release', fn: () => void): void;
}
export interface WakeLockApi {
  request(type: 'screen'): Promise<SentinelLike>;
}
type DocLike = Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;

export function createWakeLock(
  api: WakeLockApi | undefined = typeof navigator === 'undefined'
    ? undefined
    : (navigator as unknown as { wakeLock?: WakeLockApi }).wakeLock,
  doc: DocLike = document,
) {
  let sentinel: SentinelLike | null = null;
  let wanted = false;

  async function take(): Promise<boolean> {
    if (!api || !wanted) return false;
    if (sentinel) return true;
    try {
      const s = await api.request('screen');
      sentinel = s;
      s.addEventListener?.('release', () => {
        if (sentinel === s) sentinel = null;
      });
      return true;
    } catch {
      sentinel = null; // e.g. battery saver or tab not visible
      return false;
    }
  }

  const onVisible = () => {
    if (doc.visibilityState === 'visible') void take();
  };

  return {
    supported: !!api,
    /** Keep the screen on until release(). Resolves whether the lock is held now. */
    async acquire(): Promise<boolean> {
      if (!wanted) doc.addEventListener('visibilitychange', onVisible);
      wanted = true;
      return take();
    },
    async release() {
      wanted = false;
      doc.removeEventListener('visibilitychange', onVisible);
      const s = sentinel;
      sentinel = null;
      try {
        await s?.release();
      } catch {
        /* already released */
      }
    },
    get held() {
      return !!sentinel;
    },
  };
}

/**
 * Android app (KAN-72): the WebView has no Screen Wake Lock, so the shift keeps the activity window on
 * (FLAG_KEEP_SCREEN_ON) through Dokoon's plugin; it survives going to the background and back.
 */
export function nativeWakeLockApi(
  plugin: { keepAwake(o: { on: boolean }): Promise<unknown> } = DokoonNative,
): WakeLockApi {
  return {
    async request() {
      await plugin.keepAwake({ on: true });
      return { release: async () => void (await plugin.keepAwake({ on: false })) };
    },
  };
}

export type WakeLock = ReturnType<typeof createWakeLock>;
let shared: WakeLock | null = null;
export const wakeLock = (): WakeLock =>
  (shared ??= isNative() ? createWakeLock(nativeWakeLockApi()) : createWakeLock());
export const setWakeLock = (w: WakeLock | null) => {
  shared = w;
};
