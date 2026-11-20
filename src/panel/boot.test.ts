import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { checkPanelConfig } from './api/appConfig';
import { createPanelApi } from './api/client';
import { panelHandlers } from './mocks/handlers';

const BASE = 'http://panel.test/v1';

describe('checkPanelConfig (GET /app/config at startup, D-106)', () => {
  it('maintenance / forced update / nothing', async () => {
    server.use(...panelHandlers);
    const api = createPanelApi(BASE);
    expect(await checkPanelConfig(api, '0.1.0')).toBeNull();
    localStorage.setItem('dk-mock-config', JSON.stringify({ maintenance: true }));
    expect(await checkPanelConfig(api, '0.1.0')).toBe('maintenance');
    localStorage.setItem('dk-mock-config', JSON.stringify({ minVersion: '9.0.0' }));
    expect(await checkPanelConfig(api, '0.1.0')).toBe('update');
    localStorage.removeItem('dk-mock-config');
  });

  it('a failing config request never blocks the panel', async () => {
    server.use(http.get(`${BASE}/app/config`, () => HttpResponse.error()));
    expect(await checkPanelConfig(createPanelApi(BASE), '0.1.0')).toBeNull();
  });
});

describe('startPanelMocks (mock builds)', () => {
  it('Android app (Capacitor): in-page mocks, no service worker (D-71)', async () => {
    vi.resetModules();
    vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
    const { startPanelMocks } = await import('./mocks/browser');
    const mocks = await startPanelMocks();
    expect(mocks.mode).toBe('in-page');
    const res = await fetch(`${location.origin}/api/v1/r/reject-reasons`);
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(4);
    expect(typeof mocks.stream.connect).toBe('function');
    mocks.stop();
    vi.doUnmock('@capacitor/core');
  });
});
