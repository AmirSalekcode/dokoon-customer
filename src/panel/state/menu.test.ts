import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { createPanelApi } from '../api/client';
import { db } from '../mocks/db';
import { panelHandlers, resetPanelMockDb } from '../mocks/handlers';
import { usePanelNav } from '../nav/nav';
import { catDraftErrors, foodsIn, useMenu } from './menu';

const BASE = 'http://panel.test/v1';
const api = () => createPanelApi(BASE, { retries: 0 });
const st = () => useMenu.getState();
const toastText = () => useToast.getState().toasts[0]?.text;

beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  useToast.setState({ toasts: [] });
  st().reset();
  usePanelNav.getState().resetTo('menu');
});

describe('menu store (KAN-66)', () => {
  it('loads categories (by sort) and foods', async () => {
    await st().load(api());
    expect(st().status).toBe('ready');
    expect(st().categories.map((c) => c.id)).toEqual(['kebab', 'chelo', 'side']);
    expect(st().foods).toHaveLength(7);
    expect(foodsIn(st().foods, 'kebab')).toHaveLength(3);
    expect(foodsIn(st().foods, 'all')).toHaveLength(7);
  });

  it('a full-page failure shows the error page', async () => {
    server.use(
      http.get(`${BASE}/r/menu`, () => HttpResponse.json({ code: 'X', message: 'x' }, { status: 500 })),
    );
    await st().load(api());
    expect(st().status).toBe('error');
    expect(usePanelNav.getState().stack.at(-1)).toMatchObject({ screen: 'error', params: { kind: 'e500' } });
  });

  it('availability flips at once and is saved on the server', async () => {
    await st().load(api());
    const p = st().setAvailable('m1', false, api());
    expect(st().foods.find((f) => f.id === 'm1')?.available).toBe(false); // optimistic
    expect(await p).toBe(true);
    expect(db.foods.find((f) => f.id === 'm1')?.available).toBe(false);
    expect(toastText()).toBe('«چلوکباب کوبیده» ناموجود شد');
  });

  it('a failed availability change rolls back and toasts', async () => {
    await st().load(api());
    server.use(
      http.patch(`${BASE}/r/foods/:id`, () =>
        HttpResponse.json({ code: 'X', message: 'تغییر ذخیره نشد' }, { status: 409 }),
      ),
    );
    expect(await st().setAvailable('m1', false, api())).toBe(false);
    expect(st().foods.find((f) => f.id === 'm1')?.available).toBe(true);
    expect(toastText()).toBe('تغییر ذخیره نشد');
    expect(st().busy.m1).toBeFalsy();
  });

  it('a network failure also rolls back (no error page for a switch)', async () => {
    await st().load(api());
    server.use(http.patch(`${BASE}/r/foods/:id`, () => HttpResponse.error()));
    expect(await st().setAvailable('m5', true, api())).toBe(false);
    expect(st().foods.find((f) => f.id === 'm5')?.available).toBe(false);
    expect(toastText()).toBe('تغییر موجودی ذخیره نشد؛ دوباره تلاش کنید');
    expect(usePanelNav.getState().stack.at(-1)?.screen).toBe('menu');
  });

  it('a second tap while saving is ignored', async () => {
    await st().load(api());
    const a = st().setAvailable('m1', false, api());
    expect(await st().setAvailable('m1', true, api())).toBe(false);
    await a;
    expect(st().foods.find((f) => f.id === 'm1')?.available).toBe(false);
  });

  it('saves renamed and new categories', async () => {
    await st().load(api());
    const ok = await st().saveCategories(
      [
        { key: 'kebab', id: 'kebab', label: 'کباب‌های ذغالی' },
        { key: 'chelo', id: 'chelo', label: 'چلوخورش' },
        { key: 'side', id: 'side', label: 'پیش‌غذا و نوشیدنی' },
        { key: 'n1', label: ' دسر ' },
      ],
      api(),
    );
    expect(ok).toBe(true);
    expect(db.categories.map((c) => c.label)).toEqual([
      'کباب‌های ذغالی',
      'چلوخورش',
      'پیش‌غذا و نوشیدنی',
      'دسر',
    ]);
    expect(st().categories).toHaveLength(4);
  });

  it('category drafts need a unique, non-empty name', () => {
    expect(
      catDraftErrors([
        { key: 'a', label: 'کباب' },
        { key: 'b', label: ' ' },
        { key: 'c', label: 'کباب ' },
      ]),
    ).toEqual({ b: 'نام دسته را بنویسید', c: 'این نام تکراری است' });
  });

  it('a category with foods is not deleted (toast, no request)', async () => {
    await st().load(api());
    expect(await st().deleteCategory('kebab', api())).toBe(false);
    expect(toastText()).toBe('اول غذاهای این دسته را به دسته‌ی دیگری منتقل کنید');
    expect(db.categories).toHaveLength(3);
  });

  it('an empty category is deleted; a server 409 is a toast', async () => {
    await st().saveCategories([{ key: 'n', label: 'دسر' }], api());
    const id = st().categories.find((c) => c.label === 'دسر')!.id!;
    expect(await st().deleteCategory(id, api())).toBe(true);
    expect(st().categories.some((c) => c.id === id)).toBe(false);

    await st().saveCategories([{ key: 'n', label: 'سوپ' }], api());
    const soup = st().categories.find((c) => c.label === 'سوپ')!.id!;
    server.use(
      http.delete(`${BASE}/r/categories/:id`, () =>
        HttpResponse.json(
          { code: 'CATEGORY_NOT_EMPTY', message: 'فقط دسته‌ی خالی را می‌شود حذف کرد' },
          { status: 409 },
        ),
      ),
    );
    expect(await st().deleteCategory(soup, api())).toBe(false);
    expect(toastText()).toBe('فقط دسته‌ی خالی را می‌شود حذف کرد');
  });
});
