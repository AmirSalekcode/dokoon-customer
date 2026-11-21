import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hydrateSecure,
  nativeBackend,
  readSecureJsonSync,
  setSecureBackend,
  webBackend,
  writeSecureJson,
} from './secureStore';

/** Simulated DokoonNative plugin (Capacitor bridge): an in-memory "Keystore". */
function fakePlugin(seed: Record<string, string> = {}) {
  const box = new Map(Object.entries(seed));
  return {
    box,
    secureGet: vi.fn(async ({ key }: { key: string }) => ({ value: box.get(key) ?? null })),
    secureSet: vi.fn(async ({ key, value }: { key: string; value: string }) => void box.set(key, value)),
    secureRemove: vi.fn(async ({ key }: { key: string }) => void box.delete(key)),
  };
}

// KAN-72 (D-38): session tokens — localStorage on the web, Keystore in the Android apps.
beforeEach(() => localStorage.clear());
afterEach(() => setSecureBackend(null));

describe('web (PWA / browser)', () => {
  it('reads and writes localStorage synchronously', async () => {
    setSecureBackend(webBackend);
    writeSecureJson('dk-session', { accessToken: 'a' });
    expect(localStorage.getItem('dk-session')).toBe('{"accessToken":"a"}');
    expect(readSecureJsonSync('dk-session', null)).toEqual({ accessToken: 'a' });
    expect(await hydrateSecure('dk-session', null)).toEqual({ accessToken: 'a' });
  });
});

describe('Android (Keystore plugin)', () => {
  it('never writes tokens to localStorage', async () => {
    const p = fakePlugin();
    setSecureBackend(nativeBackend(p));
    writeSecureJson('dk-r-session', { accessToken: 'secret' });
    expect(localStorage.getItem('dk-r-session')).toBeNull();
    expect(await hydrateSecure('dk-r-session', null)).toEqual({ accessToken: 'secret' });
    expect(p.box.get('dk-r-session')).toBe('{"accessToken":"secret"}');
  });

  it('starts empty synchronously and hydrates from the Keystore', async () => {
    setSecureBackend(nativeBackend(fakePlugin({ 'dk-session': '{"accessToken":"k"}' })));
    expect(readSecureJsonSync('dk-session', { accessToken: null })).toEqual({ accessToken: null });
    expect(await hydrateSecure('dk-session', null)).toEqual({ accessToken: 'k' });
  });

  it('moves a plain-text session left by an older version into the Keystore', async () => {
    localStorage.setItem('dk-session', '{"accessToken":"old"}');
    const p = fakePlugin();
    setSecureBackend(nativeBackend(p));
    expect(await hydrateSecure('dk-session', null)).toEqual({ accessToken: 'old' });
    expect(localStorage.getItem('dk-session')).toBeNull();
    await vi.waitFor(() => expect(p.box.get('dk-session')).toBe('{"accessToken":"old"}'));
  });

  it('keeps write order: sign-in then sign-out ends signed out', async () => {
    const p = fakePlugin();
    setSecureBackend(nativeBackend(p));
    writeSecureJson('k', { accessToken: 'a' });
    writeSecureJson('k', { accessToken: null });
    expect(await hydrateSecure('k', null)).toEqual({ accessToken: null });
  });

  it('a broken Keystore reads as signed out instead of crashing', async () => {
    const p = fakePlugin();
    p.secureGet.mockRejectedValueOnce(new Error('KeyPermanentlyInvalidated'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setSecureBackend(nativeBackend(p));
    expect(await hydrateSecure('k', 'fallback')).toBe('fallback');
  });
});
