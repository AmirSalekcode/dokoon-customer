import { expect, test, type Page } from '@playwright/test';

/**
 * Nothing may spill outside the app frame, from small Android phones (320px) to tablets.
 * Content inside horizontal scrollers (chip rows, card rows) is allowed to extend.
 */
const VIEWPORTS: [number, number][] = [
  [320, 568],
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [844, 390],
];
const TABS = new Set(['home', 'restaurants', 'offers', 'search', 'cart', 'account']);
const SCREENS: [string, Record<string, string>?][] = [
  ['home'],
  ['restaurants'],
  ['offers'],
  ['search'],
  ['restaurant', { restaurantId: 'naghsh' }],
  ['cart'],
  ['checkout'],
  ['track', { orderId: 'o1' }],
  ['account'],
];

async function seed(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const set = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
    set('dk-consent', { version: 1, analytics: false, decidedAt: '2026-11-18' });
    set('dk-launch', { seenOnboarding: true, cityId: 'shahreza' });
    set('dk-session', { accessToken: 'a', refreshToken: 'r', user: null });
    set('dk-cart', {
      restaurant: { id: 'naghsh', name: 'کباب‌سرای نقش‌جهان' },
      lines: [{ lineId: 'n2', foodId: 'n2', title: 'کباب برگ', unitPrice: 420000, qty: 2, options: [] }],
      note: '',
      promoCode: '',
    });
  });
  await page.goto('/');
  await page.locator('main[data-screen="home"]:not([hidden]) section').first().waitFor();
}

/** Elements (not inside a clipping/scrolling ancestor) that stick out of the app frame. */
async function overflowing(page: Page, id: string): Promise<string[]> {
  return page.evaluate((id) => {
    const main = document.querySelector(`main[data-screen="${id}"]:not([hidden])`) as HTMLElement;
    const frame = (document.querySelector('.app-frame') as HTMLElement) ?? main;
    const fr = frame.getBoundingClientRect();
    const out: string[] = [];
    for (const el of Array.from(main.querySelectorAll('*'))) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      let p = el.parentElement;
      let clipped = false;
      while (p && p !== main) {
        if (getComputedStyle(p).overflowX !== 'visible') {
          clipped = true;
          break;
        }
        p = p.parentElement;
      }
      if (clipped) continue;
      if (r.right > fr.right + 1 || r.left < fr.left - 1)
        out.push(`${el.tagName.toLowerCase()} «${(el.textContent ?? '').trim().slice(0, 24)}»`);
    }
    return out;
  }, id);
}

for (const [w, h] of VIEWPORTS) {
  test(`no content spills outside the frame at ${w}×${h}`, async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'fa-IR' });
    const page = await ctx.newPage();
    await seed(page);
    for (const [id, params] of SCREENS) {
      await page.evaluate(
        async ({ id, params, tab }) => {
          // The Vite dev server serves app modules by path; this is the same nav store the app uses.
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
          if (!tab) useNav.getState().push(id, params ?? {});
        },
        { id, params, tab: TABS.has(id) },
      );
      const main = page.locator(`main[data-screen="${id}"]:not([hidden])`);
      await expect(main).toBeVisible();
      await page.waitForTimeout(700);
      expect(await overflowing(page, id), `${id} at ${w}px`).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  });
}
