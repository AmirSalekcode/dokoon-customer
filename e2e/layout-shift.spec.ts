import { expect, test, type Page } from '@playwright/test';

/**
 * CLS budget on app start. "Good" is < 0.1 (web.dev); we hold ourselves to < 0.05 so a
 * regression is caught long before users feel it. Regression found: the cookie popup
 * rendered before the web font loaded and jumped when the font swapped (CLS ≈ 0.084).
 */
// The Vite dev server compiles modules on first request; a cold first load reflows for reasons that
// do not exist in production. Warm it once so the measurement reflects the app, not the dev server.
test.beforeAll(async ({ browser }) => {
  const warm = await browser.newPage();
  await warm.goto('/', { waitUntil: 'networkidle' });
  await warm.close();
});

async function clsAfterLoad(page: Page): Promise<number> {
  // Mobile networks: the web font arrives after first render. Simulate that so font swaps are measured.
  await page.route(/\.(ttf|woff2?)(\?.*)?$/, async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.continue();
  });
  await page.addInitScript(() => {
    localStorage.setItem('dk-launch', JSON.stringify({ seenOnboarding: true, cityId: 'shahreza' }));
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[]) {
        if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'نزدیک شما' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  return page.evaluate(() => (window as unknown as { __cls: number }).__cls);
}

test('first visit (cookie popup shown): CLS < 0.05', async ({ page }) => {
  const cls = await clsAfterLoad(page);
  await expect(page.getByRole('dialog', { name: 'رضایت استفاده از کوکی' })).toBeVisible();
  expect(cls).toBeLessThan(0.05);
});

test('returning visit (consent saved): CLS < 0.05', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'dk-consent',
      JSON.stringify({ version: 1, analytics: false, decidedAt: '2026-11-18' }),
    ),
  );
  const cls = await clsAfterLoad(page);
  expect(cls).toBeLessThan(0.05);
});
