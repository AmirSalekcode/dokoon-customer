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

export type WakeLock = ReturnType<typeof createWakeLock>;
let shared: WakeLock | null = null;
export const wakeLock = (): WakeLock => (shared ??= createWakeLock());
export const setWakeLock = (w: WakeLock | null) => {
  shared = w;
};
