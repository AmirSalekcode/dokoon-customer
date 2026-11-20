import { describe, expect, it, vi } from 'vitest';
import { createWakeLock, type WakeLockApi } from './wakeLock';

// KAN-61: Screen Wake Lock during the shift, taken again after the tab comes back (D-98).
function fakeDoc() {
  const listeners = new Set<() => void>();
  return {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: vi.fn((_: string, fn: () => void) => listeners.add(fn)),
    removeEventListener: vi.fn((_: string, fn: () => void) => listeners.delete(fn)),
    emit: () => listeners.forEach((fn) => fn()),
    listeners,
  };
}
function fakeApi() {
  const sentinels: { released: boolean; onRelease?: () => void }[] = [];
  const api: WakeLockApi = {
    request: vi.fn(async () => {
      const s = { released: false, onRelease: undefined as undefined | (() => void) };
      sentinels.push(s);
      return {
        release: async () => {
          s.released = true;
        },
        addEventListener: (_: 'release', fn: () => void) => {
          s.onRelease = fn;
        },
      };
    }),
  };
  return { api, sentinels };
}

describe('wake lock', () => {
  it('acquires the screen lock and releases it', async () => {
    const { api, sentinels } = fakeApi();
    const doc = fakeDoc();
    const w = createWakeLock(api, doc as unknown as Document);
    expect(w.supported).toBe(true);
    expect(await w.acquire()).toBe(true);
    expect(api.request).toHaveBeenCalledWith('screen');
    expect(w.held).toBe(true);
    await w.release();
    expect(sentinels[0].released).toBe(true);
    expect(w.held).toBe(false);
    expect(doc.listeners.size).toBe(0);
  });

  it('takes the lock again when the panel becomes visible after the browser dropped it', async () => {
    const { api, sentinels } = fakeApi();
    const doc = fakeDoc();
    const w = createWakeLock(api, doc as unknown as Document);
    await w.acquire();
    sentinels[0].onRelease!(); // tab hidden → browser released it
    expect(w.held).toBe(false);
    doc.emit();
    await vi.waitFor(() => expect(w.held).toBe(true));
    expect(api.request).toHaveBeenCalledTimes(2);
  });

  it('unsupported browser: acquire resolves false (the UI shows the fallback message)', async () => {
    const w = createWakeLock(undefined, fakeDoc() as unknown as Document);
    expect(w.supported).toBe(false);
    expect(await w.acquire()).toBe(false);
  });

  it('a refused request (battery saver) resolves false', async () => {
    const api: WakeLockApi = { request: vi.fn(async () => Promise.reject(new Error('NotAllowedError'))) };
    expect(await createWakeLock(api, fakeDoc() as unknown as Document).acquire()).toBe(false);
  });
});
