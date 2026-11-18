import { afterEach, describe, expect, it } from 'vitest';
import { installInPageMocks } from './inPage';

let uninstall: (() => void) | null = null;
afterEach(() => {
  uninstall?.();
  uninstall = null;
});

describe('in-page mocks (no service worker: Android WebView / blocked SW)', () => {
  it('answers same-origin /api/v1 requests from the mock handlers', async () => {
    uninstall = installInPageMocks();
    const res = await fetch(`${location.origin}/api/v1/cities`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([expect.objectContaining({ id: 'shahreza' })]);
  });

  it('supports request bodies and status codes', async () => {
    uninstall = installInPageMocks();
    const res = await fetch(`${location.origin}/api/v1/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '123' }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('unknown API path → JSON 404, not the HTML shell', async () => {
    uninstall = installInPageMocks();
    const res = await fetch(`${location.origin}/api/v1/nope-not-here`);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('uninstall restores the original fetch', () => {
    const original = globalThis.fetch;
    uninstall = installInPageMocks();
    expect(globalThis.fetch).not.toBe(original);
    uninstall();
    uninstall = null;
    expect(globalThis.fetch).toBe(original);
  });
});
