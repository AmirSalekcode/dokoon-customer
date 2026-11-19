import { expect, test, type Page } from '@playwright/test';

/**
 * Tablet layout (≥ 600px wide): the app fills the screen; list/grid screens use more columns,
 * form/text screens keep a readable centered column; nav, sheets and dialogs stay centered.
 * Phones keep the 390-based layout unchanged.
 */
const TABLETS: [string, number, number][] = [
  ['tablet-800', 800, 1280],
  ['ipad-pro-1024', 1024, 1366],
  ['ipad-landscape-1180', 1180, 820],
];

async function open(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const set = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
    set('dk-consent', { version: 1, analytics: false, decidedAt: '2026-11-18' });
    set('dk-launch', { seenOnboarding: true, cityId: 'shahreza' });
    set('dk-session', { accessToken: 'a', refreshToken: 'r', user: null });
    set('dk-cart', {
      restaurant: { id: 'naghsh', name: 'کباب‌سرای نقش‌جهان' },
      lines: [{ lineId: 'n2', foodId: 'n2', title: 'کباب برگ', unitPrice: 420000, qty: 1, options: [] }],
      note: '',
      promoCode: '',
    });
  });
  await page.goto('/');
  await page.locator('main[data-screen="home"]:not([hidden]) section').first().waitFor();
}

async function go(page: Page, id: string, params: Record<string, string> = {}, tab = false) {
  await page.evaluate(
    async ({ id, params, tab }) => {
      const navUrl = '/src/nav/nav.ts';
      const { useNav } = (await import(/* @vite-ignore */ navUrl)) as {
        useNav: {
          getState(): {
            resetTo(screen: string): void;
            push(screen: string, params: Record<string, string>): void;
          };
        };
      };
      useNav.getState().resetTo(tab ? id : 'home');
      if (!tab) useNav.getState().push(id, params);
    },
    { id, params, tab },
  );
  const main = page.locator(`main[data-screen="${id}"]:not([hidden])`);
  await main.waitFor();
  await page.waitForTimeout(600);
  return main;
}

/** Number of cards sharing the first row of a grid. */
const firstRowCount = (main: ReturnType<Page['locator']>, sel: string) =>
  main.locator(sel).evaluateAll((els) => {
    const tops = els.map((e) => Math.round(e.getBoundingClientRect().top));
    return tops.filter((t) => t === tops[0]).length;
  });

for (const [name, w, h] of TABLETS) {
  test.describe(name, () => {
    test('app fills the screen; home spreads out; nav is centered and not stretched', async ({ page }) => {
      await open(page, w, h);
      const frame = await page.locator('.app-frame').boundingBox();
      expect(Math.round(frame!.width)).toBe(w);
      const nav = (await page.getByRole('navigation', { name: 'منوی اصلی' }).boundingBox())!;
      expect(nav.width).toBeLessThanOrEqual(600);
      expect(Math.abs(nav.x - (w - nav.x - nav.width))).toBeLessThanOrEqual(2);
      // Banner keeps a sensible height on wide screens.
      const banner = (await page.getByRole('region', { name: 'پیشنهادهای ویژه' }).boundingBox())!;
      expect(banner.height).toBeLessThanOrEqual(420);
      expect(banner.width).toBeGreaterThan(560);
    });

    test('restaurants tab: grid uses 3+ columns', async ({ page }) => {
      await open(page, w, h);
      const main = await go(page, 'restaurants', {}, true);
      expect(
        await firstRowCount(main, 'section[aria-label="لیست رستوران‌ها"] [role="button"][aria-label]'),
      ).toBeGreaterThanOrEqual(3);
    });

    test('restaurant menu: foods in 2+ columns', async ({ page }) => {
      await open(page, w, h);
      const main = await go(page, 'restaurant', { restaurantId: 'naghsh' });
      const foods = main.locator('section[aria-labelledby^="cat-"]').first().locator(':scope > div > *');
      expect(await foods.count()).toBeGreaterThanOrEqual(2);
      expect(
        await foods.evaluateAll((els) => {
          const tops = els.map((e) => Math.round(e.getBoundingClientRect().top));
          return tops.filter((t) => t === tops[0]).length;
        }),
      ).toBeGreaterThanOrEqual(2);
    });

    test('forms keep a readable centered column', async ({ page }) => {
      await open(page, w, h);
      for (const [id, params] of [
        ['checkout', {}],
        ['editprof', {}],
        ['addaddr', {}],
      ] as [string, Record<string, string>][]) {
        const main = await go(page, id, params);
        const box = (await main.locator('input, [role="radiogroup"]').first().boundingBox())!;
        expect(box.width, id).toBeLessThanOrEqual(680);
        expect(Math.abs(box.x + box.width / 2 - w / 2), `${id} centered`).toBeLessThanOrEqual(24);
      }
    });

    test('bottom sheet and dialog are centered, not full-width', async ({ page }) => {
      await open(page, w, h);
      await page.getByRole('button', { name: 'فیلتر و مرتب‌سازی' }).first().click();
      const sheet = (await page.getByRole('dialog', { name: 'فیلتر و مرتب‌سازی' }).boundingBox())!;
      expect(sheet.width).toBeLessThanOrEqual(640);
      expect(Math.abs(sheet.x - (w - sheet.x - sheet.width))).toBeLessThanOrEqual(2);
    });
  });
}

test('phone layout is unchanged (390): frame 390, nav inset 16px', async ({ page }) => {
  await open(page, 390, 844);
  const frame = (await page.locator('.app-frame').boundingBox())!;
  expect(Math.round(frame.width)).toBe(390);
  const nav = (await page.getByRole('navigation', { name: 'منوی اصلی' }).boundingBox())!;
  expect(Math.round(nav.x)).toBe(16);
  expect(Math.round(nav.width)).toBe(358);
});
