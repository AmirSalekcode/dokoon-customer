import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { createPanelApi } from '../api/client';
import { db } from '../mocks/db';
import { panelHandlers, resetPanelMockDb } from '../mocks/handlers';
import { stepEta, useSettings } from './settings';

// KAN-69: delivery settings — prep range 5..120 step 5 with max ≥ min, save.
const BASE = 'http://panel.test/v1';
const api = () => createPanelApi(BASE, { retries: 0 });

beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  useSettings.getState().reset();
});

describe('stepEta', () => {
  it('steps by 5 inside 5..120', () => {
    expect(stepEta(30, 45, 'min', 1)).toEqual({ etaMin: 35, etaMax: 45 });
    expect(stepEta(5, 45, 'min', -1)).toEqual({ etaMin: 5, etaMax: 45 });
    expect(stepEta(30, 120, 'max', 1)).toEqual({ etaMin: 30, etaMax: 120 });
  });
  it('keeps max ≥ min', () => {
    expect(stepEta(45, 45, 'min', 1)).toEqual({ etaMin: 50, etaMax: 50 });
    expect(stepEta(30, 30, 'max', -1)).toEqual({ etaMin: 25, etaMax: 25 });
  });
});

describe('settings store', () => {
  it('loads and saves without the read-only acceptTimeoutSec', async () => {
    await useSettings.getState().load(api());
    const cur = useSettings.getState().settings!;
    expect(cur.acceptTimeoutSec).toBe(180);
    let body: Record<string, unknown> = {};
    server.use(
      http.put(`${BASE}/r/settings`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        db.settings = { ...db.settings, ...body };
        return new HttpResponse(null, { status: 200 });
      }),
    );
    expect(await useSettings.getState().save({ ...cur, allowCash: false, etaMin: 20 }, api())).toBeNull();
    expect(body).not.toHaveProperty('acceptTimeoutSec');
    expect(db.settings).toMatchObject({ allowCash: false, etaMin: 20 });
    expect(useSettings.getState().settings).toMatchObject({ allowCash: false, etaMin: 20 });
  });

  it('returns the server message on 400', async () => {
    await useSettings.getState().load(api());
    const cur = useSettings.getState().settings!;
    expect(await useSettings.getState().save({ ...cur, etaMin: 60, etaMax: 30 }, api())).toBe(
      'حداکثر زمان باید از حداقل بیشتر باشد',
    );
  });
});
