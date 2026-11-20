import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { createPanelApi } from '../api/client';
import { panelHandlers, resetPanelMockDb } from '../mocks/handlers';
import { usePanelNav } from '../nav/nav';
import { useRestaurant } from './restaurant';

const BASE = 'http://panel.test/v1';
const api = () => createPanelApi(BASE, { retries: 0 });
const st = () => useRestaurant.getState();

beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  usePanelNav.getState().resetTo('orders');
});

describe('restaurant header state (GET /r/me, PUT /r/open)', () => {
  it('loads the profile', async () => {
    await st().load(api());
    expect(st().status).toBe('ready');
    expect(st().profile).toMatchObject({ name: 'کبابی سنتی زاگرس', open: true });
  });

  it('a full-page failure shows the error page and keeps a retry', async () => {
    server.use(
      http.get(`${BASE}/r/me`, () => HttpResponse.json({ code: 'X', message: 'x' }, { status: 503 })),
    );
    await st().load(api());
    expect(st().status).toBe('error');
    const top = usePanelNav.getState().stack.at(-1)!;
    expect(top).toMatchObject({ screen: 'error', params: { kind: 'e503' } });
  });

  it('setOpen(false) saves on the server and reports success', async () => {
    await st().load(api());
    expect(await st().setOpen(api(), false)).toBe(true);
    expect(st().profile?.open).toBe(false);
    const me = await (await fetch(`${BASE}/r/me`)).json();
    expect(me.open).toBe(false);
  });

  it('a failed switch leaves the previous state and returns false', async () => {
    await st().load(api());
    server.use(
      http.put(`${BASE}/r/open`, () =>
        HttpResponse.json({ code: 'CLOSED_BY_ADMIN', message: 'x' }, { status: 409 }),
      ),
    );
    expect(await st().setOpen(api(), false)).toBe(false);
    expect(st().profile?.open).toBe(true);
    expect(st().switching).toBe(false);
  });
});
